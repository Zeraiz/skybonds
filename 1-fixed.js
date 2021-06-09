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
    return (Math.round(num) / multiplicator).toFixed(precision);
}


function parseNumberF(a){
    let number = parseFloat(a);
    if(isNaN(number)){
        throw new Error("Is not number in array");
    }
    return number;
}

function add(accumulator, a) {
    let numericA = parseNumberF(a);
    return accumulator + numericA;
}

function getPercent(a, sum){
    let numericA = parseNumberF(a);
    return toFixed((numericA * 100 / sum), 3);
}

const data = ['1.5', '3', '6', '1.5'];

const sum = data.reduce(add, 0);

const result = data.map(function(el){
    return getPercent(el, sum);
});

console.log(result);