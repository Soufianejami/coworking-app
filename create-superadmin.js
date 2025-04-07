// Script pour créer un utilisateur super_admin

import { pool } from './server/db.js';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createSuperAdmin() {
  try {
    const hashedPassword = await hashPassword('superadmin');
    
    const query = `
      INSERT INTO users (username, password, role, "fullName")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) 
      DO UPDATE SET password = $2, role = $3, "fullName" = $4
      RETURNING id, username, role, "fullName"
    `;
    
    const values = ['superadmin', hashedPassword, 'super_admin', 'Super Administrator'];
    
    const result = await pool.query(query, values);
    console.log('Super admin user created/updated successfully:', result.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error creating super admin user:', error);
    process.exit(1);
  }
}

createSuperAdmin();