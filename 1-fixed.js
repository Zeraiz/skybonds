/**
 * Дан массив из N долей, представленных в виде N рациональных:
 * ['1.5', '3', '6', '1.5']
 * Написать программу, представляющую эти доли в процентном выражении с точностью
 * до трех знаков после запятой:
 * ['12.500', '25.000', '50.000', '12.500']
 *
 */

function toFixed( num, precision ) {
    if(typeof precision === "undefined"){
        precision = 0;
    }
    let multiplicator = Math.pow(10, precision);
    num = parseFloat((num * multiplicator).toFixed(11));
    if(num === 0){
        return num.toFixed();
    }
    let result = Math.round(num) / multiplicator;
    if(result < 0.001){
        return 0.001.toFixed(precision);
    }
    return result.toFixed(precision);
}


function parseNumberF(a){
    let number = parseFloat(a);
    if(isNaN(number)){
        throw new Error("Is not number in array");
    }
    if(number < 0){
        throw new Error("Number is lower then 0");
    }
    return number;
}

function getPercent(a){
    let numericA = parseNumberF(a);
    return toFixed((numericA * 100), 3);
}

function getPercentFromSum(a){
    let numericA = parseNumberF(a);
    return toFixed((numericA * 100 / sum), 3);
}

const data = ['1', '1', '1'];

const result = data.map(function(el){
    return getPercent(el);
});


function add(accumulator, a) {
    let numericA = parseNumberF(a);
    return accumulator + numericA;
}
const sum = data.reduce(add, 0);

const resultPercentFromSum = data.map(function(el){
    return getPercentFromSum(el, sum);
});

console.log(resultPercentFromSum);
console.log(result);