import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('security-policy')
  @Roles(UserRole.ADMIN)
  async getSecurityPolicy() {
    return this.adminService.getSecurityPolicy();
  }

  @Put('security-policy')
  @Roles(UserRole.ADMIN)
  async updateSecurityPolicy(@Body() updates: any) {
    return this.adminService.updateSecurityPolicy(updates);
  }
}
