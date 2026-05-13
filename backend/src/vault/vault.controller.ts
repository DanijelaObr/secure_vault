import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VaultService } from './vault.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { UserRole } from '../shared/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vault')
@UseGuards(JwtAuthGuard) // SVE rute zaštićene JWT-om!
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post('secrets')
  async createSecret(@Request() req, @Body() createSecretDto: CreateSecretDto) {
    return this.vaultService.createSecret(req.user.id, createSecretDto);
  }

  @Get('secrets')
  async getAllSecrets(@Request() req) {
    return this.vaultService.getAllSecrets(req.user.id);
  }

  @Get('secrets/favorites')
  async getFavoriteSecrets(@Request() req) {
    return this.vaultService.getFavoriteSecrets(req.user.id);
  }

  @Get('secrets/:id')
  async getSecretById(@Request() req, @Param('id') secretId: string) {
    return this.vaultService.getSecretById(req.user.id, secretId);
  }

  @Put('secrets/:id')
  async updateSecret(
    @Request() req,
    @Param('id') secretId: string,
    @Body() updateSecretDto: UpdateSecretDto,
  ) {
    return this.vaultService.updateSecret(
      req.user.id,
      secretId,
      updateSecretDto,
    );
  }

  @Delete('secrets/:id')
  async deleteSecret(@Request() req, @Param('id') secretId: string) {
    return this.vaultService.deleteSecret(req.user.id, secretId);
  }

  @Post('honeypot')
  @UseGuards(JwtAuthGuard, RolesGuard) // ← JWT + Role check!
  @Roles(UserRole.ADMIN) // ← Samo ADMIN!
  async createHoneypot(
    @Request() req,
    @Body() createSecretDto: CreateSecretDto,
  ) {
    return this.vaultService.createHoneypot(req.user.id, createSecretDto);
  }
}
