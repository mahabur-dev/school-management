import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-context.type';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResolveTenantDto } from './dto/resolve-tenant.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PasswordResetService } from './password-reset.service';
import type { Request, Response } from 'express';

const FIFTEEN_MINUTES = 15 * 60_000;
const REFRESH_COOKIE = 'school_saas_refresh';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(dto, { userAgent, ipAddress }).then((session) => {
      this.setRefreshCookie(
        response,
        session.refreshToken,
        session.refreshTokenExpiresAt,
      );
      return withoutRefreshToken(session);
    });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resolve-tenant')
  resolveTenant(@Body() dto: ResolveTenantDto) {
    return this.auth.resolveTenant(dto);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      dto.refreshToken ?? readCookie(request, REFRESH_COOKIE);
    if (!refreshToken) return this.auth.refresh('', { userAgent, ipAddress });
    return this.auth
      .refresh(refreshToken, { userAgent, ipAddress })
      .then((session) => {
        this.setRefreshCookie(
          response,
          session.refreshToken,
          session.refreshTokenExpiresAt,
        );
        return withoutRefreshToken(session);
      });
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.clearRefreshCookie(response);
    return this.auth.logout(user.sessionId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  logoutAll(@CurrentUser() user: RequestUser) {
    return this.auth.logoutAll(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Patch('change-password')
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.passwordReset.changePassword(user.id, dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: FIFTEEN_MINUTES } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordReset.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-reset-otp')
  verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return this.passwordReset.verifyResetOtp(dto.email, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiHeader({
    name: 'x-password-reset-token',
    required: true,
    description: 'Token returned by POST /auth/verify-reset-otp',
  })
  resetPassword(
    @Headers('x-password-reset-token') resetToken: string | undefined,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.passwordReset.resetPassword(resetToken, dto);
  }

  private setRefreshCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('app.isProduction'),
      sameSite: 'lax',
      expires: expiresAt,
      path: `/${this.config.getOrThrow<string>('app.apiPrefix')}/auth`,
    });
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('app.isProduction'),
      sameSite: 'lax',
      path: `/${this.config.getOrThrow<string>('app.apiPrefix')}/auth`,
    });
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.cookie;
  if (!cookie) return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  return cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length);
}

function withoutRefreshToken<T extends { refreshToken: string }>(
  session: T,
): Omit<T, 'refreshToken'> {
  const { refreshToken, ...publicSession } = session;
  void refreshToken;
  return publicSession;
}
