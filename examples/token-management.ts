import { BkashPayment } from '../src/index';

/**
 * Example demonstrating bKash Token Management
 * 
 * This example shows how to:
 * 1. Grant a new access token
 * 2. Refresh an existing token using refresh_token
 * 3. Handle token responses and errors
 */

const config = {
    username: 'your-username',
    password: 'your-password',
    appKey: 'your-app-key',
    appSecret: 'your-app-secret',
    isSandbox: true, // Use sandbox for testing
    log: true,
};

async function demonstrateTokenManagement() {
    try {
        // Initialize bKash payment instance
        const bkash = new BkashPayment(config);

        console.log('🚀 Starting bKash Token Management Demo\n');

        // 1. Grant new token
        console.log('📝 Requesting new grant token...');
        const grantTokenResponse = await bkash.grantToken();

        console.log('✅ Grant Token Response:');
        console.log(`   Token Type: ${grantTokenResponse.token_type}`);
        console.log(`   Access Token: ${grantTokenResponse.id_token.substring(0, 20)}...`);
        console.log(`   Expires In: ${grantTokenResponse.expires_in} seconds`);
        console.log(`   Refresh Token: ${grantTokenResponse.refresh_token.substring(0, 20)}...`);
        console.log(`   Status Code: ${grantTokenResponse.statusCode}`);
        console.log(`   Status Message: ${grantTokenResponse.statusMessage}\n`);

        // 2. Refresh token using the refresh_token from grant response
        console.log('🔄 Refreshing token...');
        const refreshTokenResponse = await bkash.refreshToken(grantTokenResponse.refresh_token);

        console.log('✅ Refresh Token Response:');
        console.log(`   Token Type: ${refreshTokenResponse.token_type}`);
        console.log(`   New Access Token: ${refreshTokenResponse.id_token.substring(0, 20)}...`);
        console.log(`   Expires In: ${refreshTokenResponse.expires_in} seconds`);
        console.log(`   New Refresh Token: ${refreshTokenResponse.refresh_token.substring(0, 20)}...`);
        console.log(`   Status Code: ${refreshTokenResponse.statusCode}`);
        console.log(`   Status Message: ${refreshTokenResponse.statusMessage}\n`);

        console.log('🎉 Token management demonstration completed successfully!');

    } catch (error: any) {
        console.error('❌ Token management failed:', error.message);

        if (error.code) {
            console.error('   Error Code:', error.code);
        }

        if (error.details) {
            console.error('   Error Details:', error.details);
        }
    }
}

// Run the demonstration
if (require.main === module) {
    demonstrateTokenManagement();
}

export { demonstrateTokenManagement };
