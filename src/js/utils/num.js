module.exports = {
  fixedRound: (number, precision) => {
    if (typeof number === 'undefined') {
      throw new Error();
    }

    var multiplier = Math.pow(10, precision + 1);
    var wholeNumber = Math.floor(number * multiplier);

    return (Math.round(wholeNumber / 10) * 10 / multiplier).toFixed(precision);
  }
};