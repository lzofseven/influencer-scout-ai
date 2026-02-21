import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
    console.log('✅ Admin initialized');
} catch (e) {
    console.log('Already init or error');
}

const db = admin.firestore();

const makeAdmin = async () => {
    const email = 'loohansb@gmail.com';
    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log(`Encontrado usuário: ${user.uid}`);

        // Set Firestore role
        await db.collection('users').doc(user.uid).set({
            role: 'admin',
            credits: 999999, // unlimited credits basically
            tier: 'Admin'
        }, { merge: true });

        // Set Custom Claim
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });

        console.log(`✅ O usuário ${email} agora é um Administrador Global!`);
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            console.log(`❌ Usuário não encontrado! Crie a conta com ${email} primeiro no front-end.`);
        } else {
            console.error(err);
        }
    }
};

makeAdmin();
