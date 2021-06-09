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

const cacheDecorator = function cacheDecorator(f) {
    const cache = {};

    const result = async function (x) {
        let date = x.date;
        let isins = x.isins;

        if (!(date in cache)) {
            cache[date] = {};
            let data = await f.call(this, x);
            data.forEach(el => {
                cache[date][el.isin] = el.data;
            });
            return data;
        }

        let notIn = [];
        isins.forEach(val => {
            if(!cache[date][val]){
                notIn.push(val);
            }
        });
        if(notIn.length !== 0){
            let data = await f.call(this, {date, isins: notIn});
            data.forEach(el => {
                cache[date][el.isin] = el.data;
            });
        }

        return isins.map((el) => {
            return {
                isin: el,
                data: cache[date][el],
            }
        });
    };

    return result;
}

const getBondsData = async ({date, isins}) => {
    if(isins.length === 0){
        return [];
    }
    return isins.map((el) => {
        return {
            isin: el,
            data: {
                date: date,
                number: Math.random(),
            }
        };
    });
};

const getBoundsDataCached = cacheDecorator(getBondsData);

(async function (){
    let result = await getBoundsDataCached({
        date: '20180120',
        isins: ['XS0971721963', 'RU000A0JU4L3']
    });

    console.log(result);

    result = await getBoundsDataCached({
        date: '20180120',
        isins: ['XS0971721963', 'RU000A0JU4L3', 'RU000A0JU4L32']
    });

    console.log(result);
})();