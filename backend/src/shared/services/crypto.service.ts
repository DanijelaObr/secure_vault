import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';

@Injectable()
export class CryptoService {
  /**
   * Generiše RSA key pair (2048 bit)
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });

    const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);

    return { publicKey, privateKey };
  }

  /**
   * Enkriptuje private key sa master password-om (AES-256)
   */
  encryptPrivateKey(privateKey: string, masterPassword: string): string {
    // Kreiraj 256-bit key iz password-a (SHA-256 hash)
    const md = forge.md.sha256.create();
    md.update(masterPassword);
    const key = md.digest().getBytes();

    // Random IV (initialization vector)
    const iv = forge.random.getBytesSync(16);

    // Enkriptuj
    const cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(privateKey, 'utf8'));
    cipher.finish();

    // Combine IV + encrypted data
    const encrypted = iv + cipher.output.getBytes();

    return forge.util.encode64(encrypted);
  }

  /**
   * Dekriptuje private key sa master password-om
   */
  decryptPrivateKey(
    encryptedPrivateKey: string,
    masterPassword: string,
  ): string {
    // Kreiraj 256-bit key iz password-a
    const md = forge.md.sha256.create();
    md.update(masterPassword);
    const key = md.digest().getBytes();

    // Decode base64
    const encrypted = forge.util.decode64(encryptedPrivateKey);

    // Extract IV (first 16 bytes)
    const iv = encrypted.substring(0, 16);
    const encryptedData = encrypted.substring(16);

    // Dekriptuj
    const decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({ iv: iv });
    decipher.update(forge.util.createBuffer(encryptedData, 'raw'));

    if (!decipher.finish()) {
      throw new Error('Decryption failed - wrong master password');
    }

    return decipher.output.toString();
  }

  /**
   * Enkriptuje podatke sa RSA public key-em
   */
  encryptWithPublicKey(data: string, publicKeyPem: string): string {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(data, 'RSA-OAEP');
    return forge.util.encode64(encrypted);
  }

  /**
   * Dekriptuje podatke sa RSA private key-em
   */
  decryptWithPrivateKey(encryptedData: string, privateKeyPem: string): string {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const encrypted = forge.util.decode64(encryptedData);
    const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP');
    return decrypted;
  }
}
