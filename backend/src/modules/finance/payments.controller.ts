import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentSchool } from '../../common/decorators/current-school.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  RequestSchool,
  RequestUser,
} from '../../common/types/request-context.type';
import { FeatureKey, UserRole } from '../../prisma';
import { RecordPaymentDto, ReversePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Finance · Payments')
@ApiBearerAuth()
@Controller('finance/payments')
@UseGuards(TenantGuard, FeatureGuard)
@RequireFeature(FeatureKey.FEE_MANAGEMENT)
@Roles(UserRole.SCHOOL_ADMIN)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentSchool() school: RequestSchool) {
    return this.payments.list(school.id);
  }

  @Post()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'A unique key used to safely retry a payment submission.',
  })
  record(
    @CurrentSchool() school: RequestSchool,
    @CurrentUser() user: RequestUser,
    @Body() dto: RecordPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.payments.record(
      school.id,
      user.id,
      dto,
      normalizedIdempotencyKey(idempotencyKey),
    );
  }

  @Get(':id')
  get(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.get(school.id, id);
  }

  @Post(':id/reverse')
  reverse(
    @CurrentSchool() school: RequestSchool,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReversePaymentDto,
  ) {
    return this.payments.reverse(school.id, id, user.id, dto.reason);
  }
}

function normalizedIdempotencyKey(value?: string) {
  if (!value)
    throw new BadRequestException(
      'Idempotency-Key is required when recording a payment',
    );
  const key = value.trim();
  if (!key || key.length > 150)
    throw new BadRequestException(
      'Idempotency-Key must contain between 1 and 150 characters',
    );
  return key;
}
