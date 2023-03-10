import { Service, PlatformAccessory } from 'homebridge';
import { DaikinTvocHomebridgePlatform } from './platform';
import request from 'axios';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DaikinTvocPlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    tvocValueMg : 0,
    tvocValue: 0,
  };

  constructor(
    private readonly platform: DaikinTvocHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly tvocUniqueId,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'DAIKIN INDUSTRIES, Ltd.')
      .setCharacteristic(this.platform.Characteristic.Model, 'BRY88AB151K')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BRY88AB151K-1');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.AirQualitySensor)
      || this.accessory.addService(this.platform.Service.AirQualitySensor);


    this.service.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.handleAirQualityGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.handleVocyGet.bind(this));
  }

  //根据TVOC值计算空气质量
  handleAirQualityGet() {
    this.platform.log.debug('Triggered GET AirQuality');

    // set this to a valid value for AirQuality
    let currentValue = this.platform.Characteristic.AirQuality.UNKNOWN;

    if(this.states.tvocValueMg < 0.2){
      currentValue = this.platform.Characteristic.AirQuality.EXCELLENT;
    }else if(this.states.tvocValueMg < 0.5){
      currentValue = this.platform.Characteristic.AirQuality.GOOD;
    }else if(this.states.tvocValueMg < 0.7){
      currentValue = this.platform.Characteristic.AirQuality.FAIR;
    }else if(this.states.tvocValueMg < 1.0){
      currentValue = this.platform.Characteristic.AirQuality.INFERIOR;
    }else{
      currentValue = this.platform.Characteristic.AirQuality.POOR;
    }
    return currentValue;
  }

  //获取TVOC
  handleVocyGet() {
    try {
      // const resp = await this.platform.api.

      const url = 'http://' + this.platform.config.ip + ':' + this.platform.config.port + '/api/states/' + this.tvocUniqueId;
      this.platform.log.info('request url: %s', url);
      const http = request.create({
        headers: {
          'Content-Type': 'application/json',
          // eslint-disable-next-line max-len
          'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIzMmRkYTczOTBkNDM0MWYxYmM1MDJiNDA3YmJlYTY4MSIsImlhdCI6MTY2MTUzNjk3OCwiZXhwIjoxOTc2ODk2OTc4fQ.VX-qoMKsNVADQZJHwsp5VsCVoh9eqKhDesOFUdtI92s',
        },
      });
      const repo = http.get(url).catch(err => {
        this.platform.log.error('error getting tvoc state %s', err);
      });

      repo.then((data) => {
        try{
          if(data['data']){
            // this.platform.log.info('repo: %s', data['data']);
            this.states.tvocValueMg = parseFloat(data['data'].state);
            this.states.tvocValue = parseFloat(data['data'].state) * 1000;
          }
        }catch(error){
          this.platform.log.error('get tvoc error');
        }
      });
    } catch (error) {
      this.platform.log.error('get tvoc error');
    }

    return this.states.tvocValue;
  }
}
