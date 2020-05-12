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

    const spaces = str.toLowerCase().replace(/\s/g, separator);
    let result;
    switch (separator) {
      case '-':
        result = spaces.replace(/_/g, separator);
        break;
      case '_':
        result = spaces.replace(/-/g, separator);
        break;
    }

    return result;
  }
}

export default StringHelper;
