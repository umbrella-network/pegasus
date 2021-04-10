// eslint-disable-next-line
export const mapParams = (params: any) => {
  // eslint-disable-next-line
  const objects: any[] = [];
  Object.keys(params)
    .filter((item) => item)
    .forEach((key) => {
      if (Array.isArray(params[key])) {
        // eslint-disable-next-line
        params[key].forEach((value: any) => {
          objects.push({key, value});
        });
      } else {
        objects.push({key, value: params[key]});
      }
    });

  const string = objects.reduce((accumulator, {key, value}) => {
    if (value === undefined || value === null) {
      return accumulator;
    }
    return `${accumulator ? `${accumulator}&` : accumulator}${key}=${value}`;
  }, '');
  return string && `?${string}`;
};
