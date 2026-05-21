import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SecurityService } from '../../shared/services/security.service';

@Injectable()
export class IPBanGuard implements CanActivate {
  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = request.ip;

    const isBanned = await this.securityService.isIPBanned(ipAddress);

    if (isBanned) {
      throw new ForbiddenException(
        'Your IP address has been banned due to suspicious activity',
      );
    }

    return true;
  }
}
