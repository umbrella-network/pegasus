import 'reflect-metadata';
import {Container} from 'inversify';
import chai from 'chai';

import Settings from '../../../src/types/Settings.js';
import OptionsPriceCalculator from '../../../src/services/calculators/OptionsPriceCalculator.js';
import {mockedLogger} from '../../mocks/logger.js';

const {expect} = chai;

describe('OptionsPriceCalculator', () => {
  let settings: Settings;
  let optionsPriceCalculator: OptionsPriceCalculator;

  beforeEach(async () => {
    const container = new Container();

    settings = {
      api: {
        optionsPrice: {
          apiKey: 'OPTIONS_PRICE_API_KEY',
          timeout: 5000,
        },
      },
    } as Settings;

    container.bind('Settings').toConstantValue(settings);
    container.bind('Logger').toConstantValue(mockedLogger);

    container.bind(OptionsPriceCalculator).toSelf();

    optionsPriceCalculator = container.get(OptionsPriceCalculator);
  });

  describe('when given an options price object', () => {
    it('formats the prices dictionaries to a key-value pair', () => {
      const options = {
        'ETH-21OCT21-3900': {
          callPrice: 0.016236001202900016,
          putPrice: 0.0271408306715053,
          iv: 80.28058628458555,
          gamma: 0.001922652027551252,
          callDelta: 0.42924941087945023,
          putDelta: -0.5707505891205498,
        },
      };

      const expected = [
        {
          key: 'SN_ETH-21OCT21-3900_call_price',
          value: 0.016236001202900016,
        },
        {
          key: 'SN_ETH-21OCT21-3900_put_price',
          value: 0.0271408306715053,
        },
        {
          key: 'SN_ETH-21OCT21-3900_iv',
          value: 80.28058628458555,
        },
        {
          key: 'SN_ETH-21OCT21-3900_gamma',
          value: 0.001922652027551252,
        },
        {
          key: 'SN_ETH-21OCT21-3900_call_delta',
          value: 0.42924941087945023,
        },
        {
          key: 'SN_ETH-21OCT21-3900_put_delta',
          value: -0.5707505891205498,
        },
      ];

      const actual = optionsPriceCalculator.apply('', options, {sym: 'ETH'});
      expect(actual).to.eql(expected);
    });
  });
});
