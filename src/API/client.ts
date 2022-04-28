import axios from 'axios'

/**
 * The API client (`axios` instance).
 * 
 * @see https://www.npmjs.com/package/axios 
 */
export const client = axios.create({
  baseURL: `${process.env.API_ORIGIN || ``}/api`,
  headers: process.env.APP_ID ? { 'X-Requested-With': process.env.APP_ID } : {},
  withCredentials: true
})
