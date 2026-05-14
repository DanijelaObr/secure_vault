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
import { ShareSecretDto } from './dto/share-secret.dto';
import { AuditService } from '../shared/services/audit.service';

@Controller('vault')
@UseGuards(JwtAuthGuard) // SVE rute zaštićene JWT-om!
export class VaultController {
  constructor(
    private readonly vaultService: VaultService,
    private readonly auditService: AuditService,
  ) {}

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

  @Post('secrets/:id/share')
  async shareSecret(
    @Request() req,
    @Param('id') secretId: string,
    @Body() shareDto: ShareSecretDto,
  ) {
    return this.vaultService.shareSecret(req.user.id, secretId, shareDto);
  }

  @Get('shared-with-me')
  async getSharedWithMe(@Request() req) {
    return this.vaultService.getSharedWithMe(req.user.id);
  }

  @Delete('secrets/:id/share/:email')
  async revokeShare(
    @Request() req,
    @Param('id') secretId: string,
    @Param('email') email: string,
  ) {
    return this.vaultService.revokeShare(req.user.id, secretId, email);
  }

  @Get('audit/recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRecentAuditLogs() {
    return this.auditService.getRecentLogs(50);
  }

  @Get('audit/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async verifyAuditIntegrity() {
    return this.auditService.verifyIntegrity();
  }

  @Get('audit/my-activity')
  async getMyActivity(@Request() req) {
    return this.auditService.getLogsByUser(req.user.id, 20);
  }
}
