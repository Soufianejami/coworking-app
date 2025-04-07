// Script pour créer un utilisateur super_admin en TypeScript

import { pool, db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './server/auth';

async function createSuperAdmin() {
  try {
    console.log('Tentative de création du compte super_admin...');
    
    const hashedPassword = await hashPassword('superadmin');
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, 'superadmin'));
    
    if (existingUser.length > 0) {
      // Mettre à jour l'utilisateur existant
      const updatedUser = await db.update(users)
        .set({
          password: hashedPassword,
          role: 'super_admin',
          fullName: 'Super Administrator'
        })
        .where(eq(users.username, 'superadmin'))
        .returning();
      
      console.log('Compte super_admin mis à jour avec succès:', {
        id: updatedUser[0].id,
        username: updatedUser[0].username,
        role: updatedUser[0].role
      });
    } else {
      // Créer un nouvel utilisateur
      const newUser = await db.insert(users)
        .values({
          username: 'superadmin',
          password: hashedPassword,
          role: 'super_admin',
          fullName: 'Super Administrator'
        })
        .returning();
      
      console.log('Compte super_admin créé avec succès:', {
        id: newUser[0].id,
        username: newUser[0].username,
        role: newUser[0].role
      });
    }
    
    // Fermer la connexion
    await pool.end();
    
    console.log('Terminé. Utilisez ces identifiants pour vous connecter:');
    console.log('- Nom d\'utilisateur: superadmin');
    console.log('- Mot de passe: superadmin');
    
  } catch (error) {
    console.error('Erreur lors de la création du compte super_admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();