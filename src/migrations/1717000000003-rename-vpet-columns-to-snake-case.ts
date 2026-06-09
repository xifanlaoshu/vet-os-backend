import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 将 vpet 模块所有驼峰列名统一改为蛇形命名
 * 仅在 开发/测试 阶段执行，已有数据均为种子数据
 */
export class RenameVpetColumnsToSnakeCase1717000000003 implements MigrationInterface {
  name = 'RenameVpetColumnsToSnakeCase1717000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === vpet_customer ===
    if (await queryRunner.hasColumn('vpet_customer', 'wechatOpenid'))
      await queryRunner.query('ALTER TABLE vpet_customer CHANGE wechatOpenid wechat_openid VARCHAR(64)')
    if (await queryRunner.hasColumn('vpet_customer', 'wechatUnionid'))
      await queryRunner.query('ALTER TABLE vpet_customer CHANGE wechatUnionid wechat_unionid VARCHAR(64)')
    if (await queryRunner.hasColumn('vpet_customer', 'idCard'))
      await queryRunner.query('ALTER TABLE vpet_customer CHANGE idCard id_card VARCHAR(18)')

    // === vpet_pet ===
    if (await queryRunner.hasColumn('vpet_pet', 'microchipId'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE microchipId microchip_id VARCHAR(50)')
    if (await queryRunner.hasColumn('vpet_pet', 'medicalHistory'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE medicalHistory medical_history TEXT')
    if (await queryRunner.hasColumn('vpet_pet', 'behaviorTag'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE behaviorTag behavior_tag VARCHAR(100)')
    if (await queryRunner.hasColumn('vpet_pet', 'lifeStage'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE lifeStage life_stage TINYINT')
    if (await queryRunner.hasColumn('vpet_pet', 'dietBrand'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE dietBrand diet_brand VARCHAR(100)')
    if (await queryRunner.hasColumn('vpet_pet', 'livingEnvironment'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE livingEnvironment living_environment TINYINT')
    if (await queryRunner.hasColumn('vpet_pet', 'otherPetsCount'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE otherPetsCount other_pets_count TINYINT')
    if (await queryRunner.hasColumn('vpet_pet', 'recentTravel'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE recentTravel recent_travel VARCHAR(200)')
    if (await queryRunner.hasColumn('vpet_pet', 'reproductiveStatus'))
      await queryRunner.query('ALTER TABLE vpet_pet CHANGE reproductiveStatus reproductive_status TINYINT')

    // === vpet_weight_record ===
    if (await queryRunner.hasColumn('vpet_weight_record', 'petId'))
      await queryRunner.query('ALTER TABLE vpet_weight_record CHANGE petId pet_id INT')
    if (await queryRunner.hasColumn('vpet_weight_record', 'recordedAt'))
      await queryRunner.query('ALTER TABLE vpet_weight_record CHANGE recordedAt recorded_at DATETIME')

    // === vpet_visit ===
    if (await queryRunner.hasColumn('vpet_visit', 'visitNo'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE visitNo visit_no VARCHAR(20)')
    if (await queryRunner.hasColumn('vpet_visit', 'doctorId'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE doctorId doctor_id INT')
    if (await queryRunner.hasColumn('vpet_visit', 'triageTime'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE triageTime triage_time DATETIME')
    if (await queryRunner.hasColumn('vpet_visit', 'callTime'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE callTime call_time DATETIME')
    if (await queryRunner.hasColumn('vpet_visit', 'startTime'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE startTime start_time DATETIME')
    if (await queryRunner.hasColumn('vpet_visit', 'endTime'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE endTime end_time DATETIME')
    if (await queryRunner.hasColumn('vpet_visit', 'chiefComplaint'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE chiefComplaint chief_complaint TEXT')
    if (await queryRunner.hasColumn('vpet_visit', 'physicalExam'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE physicalExam physical_exam JSON')
    if (await queryRunner.hasColumn('vpet_visit', 'treatmentPlan'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE treatmentPlan treatment_plan TEXT')
    if (await queryRunner.hasColumn('vpet_visit', 'doctorAdvice'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE doctorAdvice doctor_advice TEXT')
    if (await queryRunner.hasColumn('vpet_visit', 'followUpDate'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE followUpDate follow_up_date DATE')
    if (await queryRunner.hasColumn('vpet_visit', 'queueNumber'))
      await queryRunner.query('ALTER TABLE vpet_visit CHANGE queueNumber queue_number INT')

    // === vpet_prescription ===
    if (await queryRunner.hasColumn('vpet_prescription', 'rxNo'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE rxNo rx_no VARCHAR(30)')
    if (await queryRunner.hasColumn('vpet_prescription', 'visitId'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE visitId visit_id INT')
    if (await queryRunner.hasColumn('vpet_prescription', 'doctorId'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE doctorId doctor_id INT')
    if (await queryRunner.hasColumn('vpet_prescription', 'pharmacistId'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE pharmacistId pharmacist_id INT')
    if (await queryRunner.hasColumn('vpet_prescription', 'diagnosisSummary'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE diagnosisSummary diagnosis_summary VARCHAR(200)')
    if (await queryRunner.hasColumn('vpet_prescription', 'totalAmount'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE totalAmount total_amount DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_prescription', 'reviewedAt'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE reviewedAt reviewed_at DATETIME')
    if (await queryRunner.hasColumn('vpet_prescription', 'dispensedAt'))
      await queryRunner.query('ALTER TABLE vpet_prescription CHANGE dispensedAt dispensed_at DATETIME')

    // === vpet_rx_detail ===
    if (await queryRunner.hasColumn('vpet_rx_detail', 'drugId'))
      await queryRunner.query('ALTER TABLE vpet_rx_detail CHANGE drugId drug_id INT')
    if (await queryRunner.hasColumn('vpet_rx_detail', 'drugName'))
      await queryRunner.query('ALTER TABLE vpet_rx_detail CHANGE drugName drug_name VARCHAR(100)')
    if (await queryRunner.hasColumn('vpet_rx_detail', 'dosageUnit'))
      await queryRunner.query('ALTER TABLE vpet_rx_detail CHANGE dosageUnit dosage_unit VARCHAR(20)')
    if (await queryRunner.hasColumn('vpet_rx_detail', 'unitPrice'))
      await queryRunner.query('ALTER TABLE vpet_rx_detail CHANGE unitPrice unit_price DECIMAL(8,2)')

    // === vpet_billing ===
    if (await queryRunner.hasColumn('vpet_billing', 'billNo'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE billNo bill_no VARCHAR(30)')
    if (await queryRunner.hasColumn('vpet_billing', 'visitId'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE visitId visit_id INT')
    if (await queryRunner.hasColumn('vpet_billing', 'customerId'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE customerId customer_id INT')
    if (await queryRunner.hasColumn('vpet_billing', 'totalAmount'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE totalAmount total_amount DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_billing', 'paidAmount'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE paidAmount paid_amount DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_billing', 'paymentMethod'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE paymentMethod payment_method TINYINT')
    if (await queryRunner.hasColumn('vpet_billing', 'paymentStatus'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE paymentStatus payment_status TINYINT')
    if (await queryRunner.hasColumn('vpet_billing', 'cashierId'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE cashierId cashier_id INT')
    if (await queryRunner.hasColumn('vpet_billing', 'paidAt'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE paidAt paid_at DATETIME')
    if (await queryRunner.hasColumn('vpet_billing', 'invoiceNo'))
      await queryRunner.query('ALTER TABLE vpet_billing CHANGE invoiceNo invoice_no VARCHAR(30)')

    // === vpet_bill_detail ===
    if (await queryRunner.hasColumn('vpet_bill_detail', 'itemType'))
      await queryRunner.query('ALTER TABLE vpet_bill_detail CHANGE itemType item_type TINYINT')
    if (await queryRunner.hasColumn('vpet_bill_detail', 'itemName'))
      await queryRunner.query('ALTER TABLE vpet_bill_detail CHANGE itemName item_name VARCHAR(100)')
    if (await queryRunner.hasColumn('vpet_bill_detail', 'itemId'))
      await queryRunner.query('ALTER TABLE vpet_bill_detail CHANGE itemId item_id INT')
    if (await queryRunner.hasColumn('vpet_bill_detail', 'unitPrice'))
      await queryRunner.query('ALTER TABLE vpet_bill_detail CHANGE unitPrice unit_price DECIMAL(8,2)')
    if (await queryRunner.hasColumn('vpet_bill_detail', 'isInsurance'))
      await queryRunner.query('ALTER TABLE vpet_bill_detail CHANGE isInsurance is_insurance TINYINT')

    // === vpet_member_card ===
    if (await queryRunner.hasColumn('vpet_member_card', 'customerId'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE customerId customer_id INT')
    if (await queryRunner.hasColumn('vpet_member_card', 'cardNo'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE cardNo card_no VARCHAR(30)')
    if (await queryRunner.hasColumn('vpet_member_card', 'giftBalance'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE giftBalance gift_balance DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_member_card', 'totalRecharge'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE totalRecharge total_recharge DECIMAL(12,2)')
    if (await queryRunner.hasColumn('vpet_member_card', 'totalSpend'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE totalSpend total_spend DECIMAL(12,2)')
    if (await queryRunner.hasColumn('vpet_member_card', 'discountRateMedical'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE discountRateMedical discount_rate_medical DECIMAL(3,2)')
    if (await queryRunner.hasColumn('vpet_member_card', 'discountRateRetail'))
      await queryRunner.query('ALTER TABLE vpet_member_card CHANGE discountRateRetail discount_rate_retail DECIMAL(3,2)')

    // === vpet_member_card_log ===
    if (await queryRunner.hasColumn('vpet_member_card_log', 'cardId'))
      await queryRunner.query('ALTER TABLE vpet_member_card_log CHANGE cardId card_id INT')
    if (await queryRunner.hasColumn('vpet_member_card_log', 'balanceBefore'))
      await queryRunner.query('ALTER TABLE vpet_member_card_log CHANGE balanceBefore balance_before DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_member_card_log', 'balanceAfter'))
      await queryRunner.query('ALTER TABLE vpet_member_card_log CHANGE balanceAfter balance_after DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_member_card_log', 'operatorId'))
      await queryRunner.query('ALTER TABLE vpet_member_card_log CHANGE operatorId operator_id INT')
    if (await queryRunner.hasColumn('vpet_member_card_log', 'billingId'))
      await queryRunner.query('ALTER TABLE vpet_member_card_log CHANGE billingId billing_id INT')

    // === vpet_drug ===
    if (await queryRunner.hasColumn('vpet_drug', 'drugCode'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE drugCode drug_code VARCHAR(30)')
    if (await queryRunner.hasColumn('vpet_drug', 'drugName'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE drugName drug_name VARCHAR(100)')
    if (await queryRunner.hasColumn('vpet_drug', 'tradeName'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE tradeName trade_name VARCHAR(100)')
    if (await queryRunner.hasColumn('vpet_drug', 'drugType'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE drugType drug_type TINYINT')
    if (await queryRunner.hasColumn('vpet_drug', 'retailPrice'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE retailPrice retail_price DECIMAL(8,2)')
    if (await queryRunner.hasColumn('vpet_drug', 'minStock'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE minStock min_stock DECIMAL(10,2)')
    if (await queryRunner.hasColumn('vpet_drug', 'storageCondition'))
      await queryRunner.query('ALTER TABLE vpet_drug CHANGE storageCondition storage_condition VARCHAR(50)')

    // === vpet_drug_batch ===
    if (await queryRunner.hasColumn('vpet_drug_batch', 'batchNo'))
      await queryRunner.query('ALTER TABLE vpet_drug_batch CHANGE batchNo batch_no VARCHAR(50)')
    if (await queryRunner.hasColumn('vpet_drug_batch', 'expireDate'))
      await queryRunner.query('ALTER TABLE vpet_drug_batch CHANGE expireDate expire_date DATE')
    if (await queryRunner.hasColumn('vpet_drug_batch', 'purchasePrice'))
      await queryRunner.query('ALTER TABLE vpet_drug_batch CHANGE purchasePrice purchase_price DECIMAL(8,2)')
    if (await queryRunner.hasColumn('vpet_drug_batch', 'initialQuantity'))
      await queryRunner.query('ALTER TABLE vpet_drug_batch CHANGE initialQuantity initial_quantity DECIMAL(10,2)')

    // === vpet_breed ===
    if (await queryRunner.hasColumn('vpet_breed', 'speciesCode'))
      await queryRunner.query('ALTER TABLE vpet_breed CHANGE speciesCode species_code VARCHAR(20)')
    if (await queryRunner.hasColumn('vpet_breed', 'healthRisk'))
      await queryRunner.query('ALTER TABLE vpet_breed CHANGE healthRisk health_risk TEXT')
    if (await queryRunner.hasColumn('vpet_breed', 'isRare'))
      await queryRunner.query('ALTER TABLE vpet_breed CHANGE isRare is_rare TINYINT')

    // === vpet_diagnosis_code ===
    if (await queryRunner.hasColumn('vpet_diagnosis_code', 'speciesScope'))
      await queryRunner.query('ALTER TABLE vpet_diagnosis_code CHANGE speciesScope species_scope VARCHAR(20)')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：不做操作（生产环境不建议回滚列名变更）
  }
}
