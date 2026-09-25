#!/usr/bin/env node
/**
 * Manual update checker
 * Run: npx ts-node scripts/check-updates.ts
 * 
 * This script checks if an update is available for the app
 * and logs the result for debugging/testing
 */

import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    console.log('Checking for EAS updates...');
    
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('✓ Update available!');
      console.log(`  New manifest ID: ${update.manifest?.id}`);
      console.log(`  Current ID: ${Updates.updateId}`);
      
      try {
        console.log('Fetching update...');
        await Updates.fetchUpdateAsync();
        console.log('✓ Update fetched successfully');
        console.log('Restart the app to apply the update');
      } catch (error) {
        console.error('✗ Failed to fetch update:', error);
      }
    } else {
      console.log('✓ App is up to date');
    }
  } catch (error) {
    console.error('✗ Error checking for updates:', error);
  }
}

checkForUpdates();
