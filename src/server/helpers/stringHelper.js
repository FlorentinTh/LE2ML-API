class StringHelper {
  static toSlug(str, separator) {
    if (!(typeof str === 'string')) {
      throw new Error('Expected type for argument str is String');
    }

    if (
      !(typeof separator === 'string') &&
      (!(separator === '-') || !(separator === '_'))
    ) {
      throw new Error('Expected values for separator are either "-" or "_".');
    }

    return str.toLowerCase().replace(/\s/g, separator);
  }
}

export default StringHelper;
