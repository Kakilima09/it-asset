import { Platform } from 'react-native'

const emulatorDefault = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
})

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || emulatorDefault).replace(/\/+$/, '')

export const APP_VERSION = '0.1.0'

export const IS_USING_DEFAULT_API_URL = !process.env.EXPO_PUBLIC_API_URL
