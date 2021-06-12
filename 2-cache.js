/*
Дана функция, которая получает из API данные о финансовых показателях облигаций
за заданную дату по массиву идентификаторов облигаций (ISIN):
const getBondsData = async ({date, isins}) => {
    const result = await http.post({
        url: `/bonds/${date}`,
        body: isins
    });
    return result;
};
Пример вызова функции:
    getBondsData({
        date: '20180120',
        isins: ['XS0971721963', 'RU000A0JU4L3']
    });
Результат:
    [{
        isin: 'XS0971721963',
        data: {...}
    }, {
        isin: 'RU000A0JU4L3',
        data: {...}
    }]
*/

const CACHE_DEFAULT_TTL = 2;
const CACHE_DEFAULT_SIZE = 100;
const CACHE_DEFAULT_TYPE = "CACHE_DEFAULT_TYPE";
const CACHE_LRU_TYPE = "CACHE_LRU_TYPE";

function isEmpty(val) {
    return typeof val === "undefined" || val === null;
}

function CacheFabric(type, ttl, limit) {
    this.ttl = ttl || CACHE_DEFAULT_TTL;
    this.cache = new Map();
    this.type = type || CACHE_DEFAULT_TYPE;

    let cache = new Cache(this.cache, this.ttl);

    if (this.type === CACHE_LRU_TYPE) {
        return new CacheLRU(cache, limit);
    }

    return new Cache(this.cache, this.ttl);
}

function Cache(repository, defaultTtl) {
    if (!repository instanceof Map) {
        throw new Error("Cache must be instance of Map object");
    }
    return {
        has(key) {
            return repository.has(key);
        },

        set(key, value, seconds) {
            let result = {value, created: Date.now()};
            if (typeof seconds === "number") {
                result["ttl"] = seconds;
            }
            return repository.set(key, result);
        },

        get(key) {
            return repository.get(key);
        },

        delete(key) {
            return repository.delete(key);
        },

        isExpired(key, timeInMs) {
            if (typeof timeInMs !== "number") {
                throw new Error("Time with which to compare is mandatory");
            }
            let {created, ttl} = repository.get(key);
            if (typeof ttl !== "number") {
                ttl = defaultTtl;
            }
            return (timeInMs - created) > (ttl * 1000);
        },

        clear() {
            return repository.clear()
        },
    };
}

function CacheLRU(cache, limit) {
    if (!cache instanceof Cache) {
        throw new Error("Cache must be instance of Map object");
    }
    limit = limit || CACHE_DEFAULT_SIZE;
    let size = 0;
    let head = null;
    let tail = null;

    return {
        has(key) {
            let hasKey = cache.has(key);
            if (hasKey) {
                read(key);
            }
            return hasKey;
        },

        set(key, value) {
            let result = cache.get(key);
            let node = null;
            if (typeof result !== "undefined") {
                node = result.value.node;
                if (!isEmpty(node.next)) {
                    detach(node);
                    setHead(node);
                }
            } else {
                if (size === limit) {
                    this.delete(tail.key);
                    detach(tail);
                }
                node = new Node(key);
                setHead(node);
            }
            return cache.set(key, {value, node});
        },

        get(key) {
            const result = read(key);
            return getSimpleValue(result);
        },

        delete(key) {
            return cache.delete(key);
        },

        isExpired(key, seconds) {
            return cache.isExpired(key, seconds);
        },

        clear() {
            return cache.clear()
        },

        size() {
            return size;
        },

        * [Symbol.iterator]() {
            let node = tail;
            while (node) {
                yield node;
                node = node.next;
            }
        }
    };

    function read(key) {
        let result = cache.get(key);
        if (isEmpty(result)) {
            return;
        }
        if (isEmpty(result.value.node.next)) {
            return result;
        }
        detach(result.value.node);
        setHead(result.value.node);
        return result;
    }

    function setHead(node) {
        if (isEmpty(head)) {
            head = tail = node;
            size++;
            return;
        }
        head.next = node;
        node.prev = head;
        head = node;
        size++;
    }

    function detach(node) {
        if (!isEmpty(node.prev)) {
            node.prev.next = node.next;
        } else {
            tail = node.next;
        }
        if (!isEmpty(node.next)) {
            node.next.prev = node.prev;
        } else {
            head = node.prev;
        }
        node.prev = null;
        node.next = null;

        size--;
    }

    function Node(key, next, prev) {
        if (!next instanceof Node) {
            next = null;
        }
        if (!prev instanceof Node) {
            prev = null;
        }
        return {
            key, next, prev
        };
    }

    function getSimpleValue(cacheValue) {
        return cacheValue?.value?.value;
    }
}

const cache = new CacheFabric(CACHE_LRU_TYPE, CACHE_DEFAULT_TTL, 1);

const cacheDecorator = function cacheDecorator(f, cache, loadIsinHandler) {
    if (isEmpty(cache)) {
        throw new Error("Cache repository is required");
    }

    return async function (x) {
        let date = x.date;
        let isins = x.isins;

        let notIn = [];
        let result = [];

        isins.forEach(isin => {
            let key = date + isin;
            const cachedIsin = cache.get(key);
            if (isEmpty(cachedIsin)) {
                notIn.push(isin);
                cache.set(key, {isLoading: true});
            } else {
                result.push(cachedIsin);
            }
        });

        if (notIn.length !== 0) {
            let data = await f.call(this, {date, isins: notIn});
            data.forEach(el => {
                let key = date + el.isin;
                const tempIsinData = {isin: el.isin, data: el.data};
                cache.set(key, tempIsinData);
                if (typeof loadIsinHandler === "function") {
                    loadIsinHandler(tempIsinData);
                }
                result.push(tempIsinData);
            });


            notIn.forEach(isin => {
                if (typeof data.find(el => el.isin === isin) !== "undefined") {
                    return;
                }
                let key = date + isin;
                cache.delete(key);
                if (typeof loadIsinHandler === "function") {
                    loadIsinHandler({date: date, isin: isin, error: new Error("Isin not found")});
                }
            });
        }

        return result.map((el) => {
            return {
                isin: el.isin,
                data: el.data,
                isLoading: el.isLoading ?? false
            }
        });
    };
}

const getBondsData = async ({date, isins}) => {
    return isins.map((isin) => {
        return {
            isin: isin,
            data: {
                date: date,
                number: Math.random(),
            }
        };
    }).filter(isin => isin.isin !== "XS0971721963");
};

const getBoundsDataCached = cacheDecorator(getBondsData, cache, function (response) {
    console.log("Статус инструмента изменился: ", response);
});

let result = getBoundsDataCached({
    date: '20180120',
    isins: ['XS0971721963']
});

(async function () {
    result = await getBoundsDataCached({
        date: '20180120',
        isins: ['XS0971721963', 'RU000A0JU4L3', 'RU000A0JU4L32']
    });

    console.log("Проверка кеша №1", result);

    result = await getBoundsDataCached({
        date: '20180120',
        isins: ['RU000A0JU4L32']
    });

    console.log("Проверка кеша №2", result);
})();