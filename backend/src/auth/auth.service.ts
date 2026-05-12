import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const { email, username, password, role } = registerDto;

    // Provjeri da li korisnik već postoji
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash lozinke
    const passwordHash = await bcrypt.hash(password, 10);

    // TODO: Generisati RSA key pair (asimetrična kriptografija)
    // Za sada - placeholder
    const publicKey = 'PUBLIC_KEY_PLACEHOLDER';
    const encryptedPrivateKey = 'ENCRYPTED_PRIVATE_KEY_PLACEHOLDER';

    // Kreiraj korisnika
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      role,
      publicKey,
      encryptedPrivateKey,
      mfaEnabled: false,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      message: 'User registered successfully',
      userId: savedUser.id,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ message: string; userId: string }> {
    const { email, password } = loginDto;

    // Pronađi korisnika
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Provjeri da li je nalog frozen (honeypot)
    if (user.isFrozen) {
      throw new UnauthorizedException(
        'Account is frozen. Contact administrator.',
      );
    }

    // Provjeri lozinku
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // TODO: Provjeri MFA ako je enabled
    // TODO: Generiši JWT token

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return {
      message: 'Login successful',
      userId: user.id,
    };
  }
}
