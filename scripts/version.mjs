const MAX_CHROME_VERSION_COMPONENT = 65_535;

export function isValidChromeVersion(value) {
  if (typeof value !== 'string') return false;
  const components = value.split('.');
  if (components.length < 1 || components.length > 4) return false;
  if (components.some(component => !/^(?:0|[1-9]\d*)$/.test(component))) return false;
  if (components.some(component => Number(component) > MAX_CHROME_VERSION_COMPONENT)) return false;
  return components.some(component => Number(component) > 0);
}

export function assertChromeVersion(value) {
  if (!isValidChromeVersion(value)) {
    throw new Error('Invalid Chrome extension version: "' + value + '". Use 1 to 4 integer components from 0 to 65535, without leading zeroes.');
  }
  return value;
}

export function chromeSupportedLine(value) {
  assertChromeVersion(value);
  const [major = '0', minor = '0'] = value.split('.');
  return major + '.' + minor + '.x';
}
