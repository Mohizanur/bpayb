console.log('Checking admin environment configuration...\n');

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const jwtSecret = process.env.JWT_SECRET || 'birrpay_default_secret_change_in_production';

console.log('Admin Username:', adminUsername);
console.log('Admin Password:', adminPassword ? '***SET***' : '***NOT SET***');
console.log('JWT Secret:', jwtSecret ? '***SET***' : '***NOT SET***');

console.log('\nDefault credentials will be:');
console.log('Username: admin');
console.log('Password: admin123');

console.log('\nTo change these, set the following environment variables:');
console.log('ADMIN_USERNAME=your_admin_username');
console.log('ADMIN_PASSWORD=your_admin_password');
console.log('JWT_SECRET=your_jwt_secret');

console.log('\n⚠️  WARNING: Change the default credentials in production!');