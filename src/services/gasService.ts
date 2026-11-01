/**
 * Google Apps Script Web App Integration Service
 * Connects frontend PWA with backend Google Apps Script and Google Sheets
 * Spreadsheet ID: YOUR_SPREADSHEET_ID
 */

import { storage } from './storage';
import { remoteSession } from './remoteAccounts';

export interface GasResponse<T = unknown> {
  success: boolean;
  syncVersion?: number;
  message?: string;
  data?: T;
  error?: string;
}

export class GasService {
  /**
   * Test connection to deployed Google Apps Script Web App
   */
  public static async testConnection(scriptUrl: string): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: unknown;
  }> {
    if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/')) {
      return {
        success: false,
        message: 'Invalid URL. Must start with https://script.google.com/macros/s/.../exec'
      };
    }

    const startTime = Date.now();
    try {
      // Use mode 'cors' or fallback to no-cors check
      const testEndpoint = `${scriptUrl}?action=ping&t=${Date.now()}`;
      
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          message: `Server returned HTTP ${response.status}: ${response.statusText}`
        };
      }

      const json = await response.json();
      return {
        success: json.success === true,
        latencyMs,
        message: json.message || json.error || (json.success === true ? 'Connected successfully to Google Apps Script!' : 'Backend rejected the connection check.'),
        details: json
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // Note on Google Apps Script CORS:
      // Google Apps Script redirect can sometimes trigger CORS in simple browser fetch if ContentService.MimeType is not TEXT/JSON.
      return {
        success: false,
        latencyMs,
        message: `Connection failed: ${errorMsg}. Please ensure Google Apps Script Web App is deployed with 'Execute as: Me' and 'Who has access: Anyone'.`
      };
    }
  }

  /**
   * Post action to Google Apps Script Web App
   */
  public static async sendToGas(
    action: string,
    payload: Record<string, unknown>,
    scriptUrl?: string
  ): Promise<GasResponse> {
    const settings = storage.getSettings();
    const endpoint = (scriptUrl || settings.appsScriptUrl).trim();
    if (!endpoint) {
      return {
        success: false,
        message: 'Google Apps Script URL is not configured. Using local persistence.'
      };
    }

    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/.test(endpoint)) {
      return { success: false, message: 'Use the deployed Google Apps Script URL ending in /exec.' };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // GAS handles text/plain without CORS preflight issues
        },
        body: JSON.stringify({
          action,
          payload,
          authToken: remoteSession(endpoint)?.token,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const resJson = await response.json();
      return resJson;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Google Apps Script call failed:', msg);
      return {
        success: false,
        message: msg
      };
    }
  }

  /**
   * Sync complete local state to Google Sheets via GAS
   */
  public static async syncAllToGoogleSheets(scriptUrl?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const settings = storage.getSettings();
    if (!(scriptUrl || settings.appsScriptUrl)) {
      return {
        success: false,
        message: 'Please set your Google Apps Script Web App URL first in Settings.'
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = storage.getGoogleSheetsSnapshot();
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }

    const res = await this.sendToGas('SYNC_BULK_DATA', payload, scriptUrl);
    if (res.success === true && res.syncVersion !== 2) {
      return { success: false, message: 'The backend is still the old version. Deploy the unified Code.gs as a new Web App version, then sync again.' };
    }
    return {
      success: res.success === true,
      message: res.message || res.error || (res.success ? 'Synced successfully to Google Sheets!' : 'Sync failed.')
    };
  }
}
