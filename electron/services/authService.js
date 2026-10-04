const crypto = require('crypto');

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
    if (typeof password !== 'string') return false;
    if (typeof storedHash !== 'string' || !storedHash.includes(':')) return false;
    const [salt, hash] = storedHash.split(':');
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === checkHash;
};

const generateRecoveryKey = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + 
           crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateRecoveryKey
};
