import type {AppSettings} from '../types';
export const sharedSettingKeys=['currencyCode','currencySymbol','currencyPosition','pricePerCrate','contractAlertDays','warningThresholdPercent','language','dashboardTheme'] as const;
export type SharedSettings=Partial<Pick<AppSettings,typeof sharedSettingKeys[number]>>;
export function sharedSettings(value:unknown):SharedSettings {
  if(!value || typeof value!=='object'||Array.isArray(value))throw Error('Invalid shared settings');
  const source=value as Record<string,unknown>,result:Record<string,unknown>={};
  for(const key of sharedSettingKeys){
    const v=source[key];if(v===undefined)continue;
    const options:Record<string,readonly unknown[]>={currencyCode:['LAK','USD','THB'],currencyPosition:['before','after'],language:['lo','en'],dashboardTheme:['glass','executive','neon','minimal','luxury']};
    if(options[key]&&!options[key].includes(v))throw Error('Invalid shared setting: '+key);
    if(key==='currencySymbol'&&(typeof v!=='string'||!v.length||v.length>8))throw Error('Invalid currency symbol');
    if(['pricePerCrate','contractAlertDays','warningThresholdPercent'].includes(key)&&(typeof v!=='number'||!Number.isFinite(v)||v<0||key!=='contractAlertDays'&&v===0||key==='warningThresholdPercent'&&v>100||key==='contractAlertDays'&&v>3650))throw Error('Invalid shared number: '+key);
    result[key]=v;
  }
  return result as SharedSettings;
}
