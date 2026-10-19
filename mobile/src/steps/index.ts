import { Platform } from 'react-native';

import * as android from './android';
import * as ios from './ios';

export * from './rules';

const impl = Platform.OS === 'ios' ? ios : android;

export const healthStoreName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
export const connect = impl.connect;
export const readDailySteps = impl.readDailySteps;
