import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.getOrThrow<number>('auth.bcryptRounds');
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /** Spends the same time as a real check, so unknown emails are not detectable by timing. */
  async burn(password: string): Promise<void> {
    await bcrypt.hash(password, this.rounds);
  }
}
