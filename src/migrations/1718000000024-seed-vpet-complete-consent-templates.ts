import { MigrationInterface, QueryRunner } from 'typeorm'

interface ConsentTemplateSeed {
  code: string
  name: string
  category: string
  riskLevel: string
  description: string
  content: string
}

const commonHeader = [
  '宠主姓名：__________    联系电话：__________',
  '宠物姓名：__________    物种/品种：__________    年龄：__________    体重：__________kg',
  '就诊编号：__________    告知医生：__________    告知日期：____年__月__日',
  '',
].join('\n')

const commonFooter = [
  '',
  '本人已阅读并理解以上内容，医护人员已对诊疗目的、可选方案、主要风险、费用可能变化及后续护理要求进行说明。本人确认有机会提问，并同意按本告知书所述方向进行处理。',
  '',
  '宠主/代理人签名：__________    与宠物关系：__________    签署日期：____年__月__日',
  '医护人员签名：__________',
].join('\n')

const templates: ConsentTemplateSeed[] = [
  {
    code: 'CONSENT_REGISTRATION_TRIAGE',
    name: '初诊分诊与基础检查告知书',
    category: 'examination',
    riskLevel: 'low',
    description: '适用于初诊登记、分诊、基础体格检查前告知。',
    content: `${commonHeader}一、告知事项\n1. 本次基础检查包括问诊、视诊、触诊、听诊、体温/体重等基础评估，检查结果用于判断后续诊疗方向。\n2. 部分宠物可能因紧张、疼痛或攻击行为出现应激、挣扎、抓咬、呼吸急促等情况，必要时可能需要保定或调整检查方式。\n3. 基础检查不能完全替代化验、影像、专科检查，若医生认为有必要，将另行说明并征得同意。\n4. 宠主需如实提供既往病史、用药史、疫苗史、过敏史、近期饮食和接触史。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_EMERGENCY_CRITICAL',
    name: '急危重症抢救告知书',
    category: 'emergency',
    riskLevel: 'critical',
    description: '适用于休克、呼吸困难、抽搐、中毒、创伤等急危重症抢救。',
    content: `${commonHeader}一、病情说明\n宠物目前存在或疑似存在急危重情况，可能出现病情快速恶化、呼吸心跳骤停、多器官功能损伤甚至死亡。\n\n二、抢救告知\n1. 医院将优先采取维持生命体征的紧急处理，包括吸氧、建立静脉通路、补液、止血、镇痛、抗休克、心肺复苏等。\n2. 抢救过程中可能需要根据病情即时追加检查、用药或处置，费用可能持续变化。\n3. 即使积极抢救，仍可能因原发疾病严重、送医时间、基础疾病等原因无法挽回生命。\n4. 宠主选择的抢救范围：全部抢救__________    限制抢救__________    放弃抢救__________。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_EXAM_GENERAL',
    name: '专项检查知情告知书',
    category: 'examination',
    riskLevel: 'low',
    description: '适用于眼科、皮肤、耳道、神经、骨科等专项检查。',
    content: `${commonHeader}一、检查项目\n拟进行专项检查：________________________________________。\n\n二、风险与限制\n1. 检查可能需要局部保定、采样、压迫、牵拉或使用检眼镜、耳镜等器械，可能引起短暂不适。\n2. 若宠物疼痛明显或无法配合，可能需要镇静、止痛或分阶段检查。\n3. 单项检查结果需结合病史、体检、化验或影像综合判断，不能单独作为全部诊断依据。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_LAB_SAMPLE',
    name: '采样检查知情告知书',
    category: 'lab',
    riskLevel: 'low',
    description: '适用于抽血、穿刺、拭子、尿液、粪便、皮肤采样等。',
    content: `${commonHeader}一、采样项目\n拟采样项目：血液__________    尿液__________    粪便__________    皮肤/耳道__________    细针穿刺__________    其他__________。\n\n二、风险告知\n1. 采样可能出现短暂疼痛、出血、淤青、局部肿胀、应激、样本不足或污染等情况。\n2. 部分穿刺或深部采样可能存在感染、出血、误伤周边组织等风险。\n3. 检查结果受采样时间、样本质量、疾病阶段、近期用药等因素影响，需结合临床综合判断。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_LAB_EXTERNAL',
    name: '外送检测知情告知书',
    category: 'lab',
    riskLevel: 'low',
    description: '适用于 PCR、病理、药敏、内分泌等外送检测。',
    content: `${commonHeader}一、外送项目\n拟外送检测项目：________________________________________。\n\n二、告知事项\n1. 外送检测由第三方实验室完成，报告时间可能受物流、样本状态、节假日和实验室排期影响。\n2. 若样本不合格、溶血、污染或数量不足，可能需要重新采样并产生额外费用。\n3. 外送报告仅作为诊疗参考，最终解释需结合临床表现和医生判断。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_IMAGING_GENERAL',
    name: '影像检查知情告知书',
    category: 'imaging',
    riskLevel: 'low',
    description: '适用于 DR、B 超、心超等不一定需要镇静的影像检查。',
    content: `${commonHeader}一、影像项目\n拟检查项目：DR__________    B超__________    心超__________    其他__________。\n\n二、告知事项\n1. 影像检查可能需要保定、剃毛、改变体位或短时间禁食，宠物可能出现紧张和不适。\n2. 影像结果可能受配合度、肠气、肥胖、疼痛、设备条件等影响，必要时需复查或联合其他检查。\n3. 若检查中发现宠物无法配合或存在疼痛，应另行评估是否需要镇静或麻醉。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_IMAGING_SEDATION',
    name: '影像检查镇静知情告知书',
    category: 'imaging',
    riskLevel: 'medium',
    description: '适用于因影像检查固定、疼痛或恐惧需要镇静的场景。',
    content: `${commonHeader}一、镇静原因\n宠物因疼痛、紧张、无法保持体位或检查要求，拟在影像检查中使用镇静药物。\n\n二、风险告知\n1. 镇静可能出现呼吸循环抑制、呕吐误吸、体温下降、苏醒延迟、过敏反应等风险。\n2. 年老、幼龄、短鼻犬猫、心肺疾病、肝肾功能异常宠物风险更高。\n3. 镇静不等同于完全麻醉，仍需根据检查中状态动态调整方案。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_ANESTHESIA',
    name: '麻醉知情告知书',
    category: 'anesthesia',
    riskLevel: 'high',
    description: '适用于吸入麻醉、注射麻醉、镇静前风险告知。',
    content: `${commonHeader}一、麻醉目的\n因检查/治疗/手术需要，宠物拟接受麻醉或深度镇静。\n\n二、主要风险\n1. 麻醉可能出现呕吐误吸、呼吸抑制、循环抑制、低体温、过敏、苏醒延迟、苏醒躁动、心律异常甚至死亡。\n2. 幼龄、老年、肥胖、短鼻品种、心肺疾病、肝肾疾病、贫血、脱水、休克、严重感染等会提高麻醉风险。\n3. 术前检查可降低但不能完全消除麻醉风险；麻醉过程中医院会进行必要监护并根据情况处理。\n4. 建议术前检查项目：血常规__________    生化__________    凝血__________    影像/心超__________    其他__________。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_ANALGESIA_SEDATION',
    name: '镇痛镇静用药告知书',
    category: 'anesthesia',
    riskLevel: 'medium',
    description: '适用于门诊处置、换药、清创、疼痛控制中的镇痛镇静。',
    content: `${commonHeader}一、用药目的\n为减轻疼痛、降低应激或完成必要处置，拟使用镇痛/镇静药物。\n\n二、风险告知\n1. 可能出现嗜睡、呕吐、流涎、步态不稳、呼吸变慢、血压变化、排尿变化等反应。\n2. 部分药物可能影响肝肾、胃肠道或心血管系统，用药后需按医嘱观察。\n3. 若宠物存在既往药物不良反应，请在签署前主动告知：________________________________________。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_SURGERY_GENERAL',
    name: '常规手术知情告知书',
    category: 'surgery',
    riskLevel: 'high',
    description: '适用于绝育、肿物切除、清创缝合等常规手术。',
    content: `${commonHeader}一、拟行手术\n手术名称：________________________________________。\n\n二、风险告知\n1. 手术可能发生出血、感染、疼痛、伤口裂开、组织坏死、复发、术中改变方案、术后恢复不佳等情况。\n2. 手术通常需要麻醉，麻醉风险另行告知或已在本告知中一并说明。\n3. 术中若发现实际病变与术前判断不一致，医生可能需要调整手术范围或处理方式。\n4. 术后需按医嘱佩戴头套、限制活动、复诊拆线和用药，护理不到位会增加并发症风险。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_NEUTER',
    name: '绝育手术知情告知书',
    category: 'surgery',
    riskLevel: 'medium',
    description: '适用于犬猫公母绝育手术。',
    content: `${commonHeader}一、手术类型\n公犬去势__________    公猫去势__________    母犬绝育__________    母猫绝育__________。\n\n二、风险告知\n1. 绝育手术存在麻醉、出血、感染、疼痛、伤口舔咬裂开、隐睾寻找困难、卵巢/子宫残端问题等风险。\n2. 母犬母猫发情期、怀孕、子宫蓄脓、肥胖或基础疾病会增加手术难度和风险。\n3. 术后体重管理、运动管理和伤口护理对恢复非常重要。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_DENTAL',
    name: '洁牙拔牙知情告知书',
    category: 'dental',
    riskLevel: 'medium',
    description: '适用于洁牙、牙周治疗、拔牙。',
    content: `${commonHeader}一、口腔治疗项目\n超声洁牙__________    抛光__________    拔牙__________    牙周治疗__________    其他__________。\n\n二、风险告知\n1. 洁牙拔牙可能出现牙龈出血、术后疼痛、进食下降、口腔感染、牙根断裂、口鼻瘘、下颌骨损伤等风险。\n2. 牙齿松动、牙根吸收或牙周病严重时，术中可能发现需拔除的牙齿数量多于术前预估。\n3. 多数口腔治疗需要麻醉，麻醉风险需一并知晓。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_WOUND_DEBRIDEMENT',
    name: '创伤清创缝合告知书',
    category: 'surgery',
    riskLevel: 'medium',
    description: '适用于咬伤、撕裂伤、脓肿、异物伤等清创缝合。',
    content: `${commonHeader}一、创伤情况\n创伤部位：____________________    发现时间：____________________。\n\n二、风险告知\n1. 创伤可能存在污染、坏死、深部感染、异物残留、组织缺损、伤口张力大等情况。\n2. 清创缝合后仍可能出现感染、渗出、裂开、坏死、需二次清创或延迟愈合。\n3. 咬伤和脓肿创口常需引流、换药、复查，治疗周期和费用可能随恢复情况变化。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_HOSPITALIZATION',
    name: '住院治疗知情告知书',
    category: 'hospitalization',
    riskLevel: 'medium',
    description: '适用于住院观察、持续治疗、护理执行。',
    content: `${commonHeader}一、住院原因\n住院诊疗目的：观察__________    输液__________    术后护理__________    隔离__________    重症监护__________    其他__________。\n\n二、风险告知\n1. 住院期间病情可能变化，可能需要复查、调整用药、追加处置或转入更高级别监护。\n2. 宠物可能因环境变化出现应激、食欲下降、吠叫、抓咬、舔咬管路或伤口等行为。\n3. 住院费用按实际发生项目结算，若治疗周期延长或病情加重，费用可能增加。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_ICU_CRITICAL_CARE',
    name: '重症监护知情告知书',
    category: 'hospitalization',
    riskLevel: 'critical',
    description: '适用于 ICU、持续吸氧、严密监测、危重症住院。',
    content: `${commonHeader}一、重症状态\n宠物目前存在较高生命风险，需要严密监测和连续治疗。\n\n二、风险告知\n1. 重症监护可能涉及持续输液、吸氧、升压、镇痛、抗感染、营养支持、导尿、反复采血等。\n2. 即使在监护条件下，仍可能出现休克、呼吸衰竭、心律失常、凝血异常、器官衰竭或死亡。\n3. 医院会根据病情变化及时沟通治疗计划和费用，但急救处置可能先于完整书面确认。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_INFUSION',
    name: '输液治疗知情告知书',
    category: 'treatment',
    riskLevel: 'medium',
    description: '适用于静脉输液、皮下补液、连续给药。',
    content: `${commonHeader}一、治疗项目\n静脉输液__________    皮下补液__________    留置针__________    连续泵入__________。\n\n二、风险告知\n1. 输液可能出现药物过敏、输液反应、静脉炎、漏液、局部肿胀疼痛、留置针脱落、咬管等情况。\n2. 心脏病、肾病、低蛋白、幼龄或老年宠物对液体速度和剂量更敏感，可能出现水肿或呼吸负担。\n3. 输液治疗需按病情动态调整，可能需要复查电解质、肾功能或其他指标。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_INJECTION',
    name: '注射治疗知情告知书',
    category: 'treatment',
    riskLevel: 'low',
    description: '适用于皮下、肌肉、静脉注射及局部封闭治疗。',
    content: `${commonHeader}一、注射项目\n皮下注射__________    肌肉注射__________    静脉注射__________    局部注射__________。\n\n二、风险告知\n1. 注射可能出现疼痛、肿胀、出血、局部硬结、感染、过敏、短暂精神食欲变化等。\n2. 部分药物刺激性较强，若出现持续疼痛、肿胀扩大、精神异常需及时联系医院。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_MEDICATION_OFFLABEL',
    name: '特殊/超说明书用药告知书',
    category: 'medication',
    riskLevel: 'high',
    description: '适用于特殊药、超说明书用药、联合用药或高风险药物。',
    content: `${commonHeader}一、用药说明\n拟使用药物：________________________________________。\n用药原因：________________________________________。\n\n二、风险告知\n1. 部分药物在宠物临床中可能属于超说明书使用、经验性使用或需严密监测的特殊用药。\n2. 可能出现胃肠反应、过敏、肝肾负担、神经症状、血液学异常或与其他药物相互作用。\n3. 宠主需严格按医嘱剂量、频次和疗程给药，不得自行加量、停药或混用人药。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_CONTROLLED_DRUG',
    name: '镇痛/管制类药品使用告知书',
    category: 'medication',
    riskLevel: 'high',
    description: '适用于阿片类、强镇静、强镇痛及需特殊管理药物。',
    content: `${commonHeader}一、药品用途\n拟使用药物用于镇痛、镇静、麻醉辅助或重度疼痛控制。\n\n二、风险告知\n1. 该类药物可能出现嗜睡、呼吸抑制、心率血压变化、兴奋、呕吐、排尿异常等反应。\n2. 药品需由医院按规范管理和使用，宠主不得自行留存、转用或给其他动物使用。\n3. 用药后需按医嘱观察，出现异常需立即联系医院。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_BLOOD_TRANSFUSION',
    name: '输血/血制品治疗告知书',
    category: 'transfusion',
    riskLevel: 'critical',
    description: '适用于全血、红细胞、血浆、白蛋白等血液制品治疗。',
    content: `${commonHeader}一、输血原因\n贫血__________    出血__________    凝血异常__________    低蛋白__________    其他__________。\n\n二、风险告知\n1. 输血/血制品可能出现发热、过敏、溶血反应、呼吸循环负担、感染传播风险、治疗无效等。\n2. 配血和筛查可降低但不能完全消除输血风险。\n3. 输血期间和输血后需严密观察体温、呼吸、心率、尿色、精神状态等。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_OXYGEN_NEBULIZATION',
    name: '吸氧雾化治疗告知书',
    category: 'treatment',
    riskLevel: 'medium',
    description: '适用于呼吸道疾病、术后恢复、雾化给药、氧舱观察。',
    content: `${commonHeader}一、治疗项目\n吸氧__________    雾化__________    氧舱观察__________。\n\n二、风险告知\n1. 呼吸系统疾病可能进展较快，吸氧雾化只能作为支持治疗或局部治疗，不能保证完全纠正病因。\n2. 宠物可能因氧舱或雾化环境产生紧张、抓挠、流涎、咳嗽加重等情况。\n3. 若出现呼吸困难加重、舌色发紫、虚弱倒地，应立即升级急救处理。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_VACCINATION',
    name: '疫苗接种知情告知书',
    category: 'vaccination',
    riskLevel: 'medium',
    description: '适用于犬猫疫苗接种前告知。',
    content: `${commonHeader}一、接种项目\n核心疫苗__________    狂犬疫苗__________    其他疫苗__________。\n\n二、风险告知\n1. 疫苗接种后可能出现短暂精神食欲下降、低热、注射部位疼痛、局部肿胀、呕吐腹泻、过敏甚至休克。\n2. 接种前需确认宠物近期健康，无发热、呕吐腹泻、咳嗽、明显皮肤病、应激或免疫抑制情况。\n3. 接种后建议留院观察__________分钟，回家后避免洗澡、剧烈运动和更换环境。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_DEWORMING',
    name: '驱虫治疗知情告知书',
    category: 'prevention',
    riskLevel: 'low',
    description: '适用于体内外驱虫、耳螨、蠕形螨等寄生虫治疗。',
    content: `${commonHeader}一、驱虫项目\n体内驱虫__________    体外驱虫__________    耳螨治疗__________    其他__________。\n\n二、风险告知\n1. 驱虫后可能出现短暂呕吐、腹泻、食欲下降、皮肤瘙痒、虫体排出等反应。\n2. 幼龄、怀孕、哺乳、体弱或肝肾功能异常宠物需谨慎选择药物。\n3. 寄生虫治疗常需按周期重复用药，并配合环境清洁和同住动物同步管理。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_ISOLATION',
    name: '传染病隔离治疗知情告知书',
    category: 'isolation',
    riskLevel: 'high',
    description: '适用于疑似或确诊传染病隔离诊疗。',
    content: `${commonHeader}一、隔离原因\n疑似/确诊疾病：________________________________________。\n\n二、风险告知\n1. 传染病可能病程进展快、传染性强、预后不确定，需限制探视并按隔离流程护理。\n2. 隔离期间可能需要反复检测、输液、营养支持、抗感染、环境消毒等，费用按实际发生结算。\n3. 宠主需配合家庭环境消毒和同住动物观察，避免交叉感染。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_ZOONOSIS',
    name: '人畜共患病风险告知书',
    category: 'isolation',
    riskLevel: 'high',
    description: '适用于狂犬病风险、钩端螺旋体、皮肤真菌、寄生虫等人畜共患风险。',
    content: `${commonHeader}一、风险疾病\n疑似/确诊人畜共患风险：________________________________________。\n\n二、告知事项\n1. 该类疾病可能对人或其他动物存在传播风险，宠主需按医嘱隔离、消毒、佩戴防护用品并及时就医咨询。\n2. 若存在咬伤、抓伤、体液接触等情况，应按公共卫生要求处理。\n3. 医院可能需按法律法规或公共卫生要求进行报告、留观或转诊。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_REFERRAL',
    name: '转诊告知书',
    category: 'referral',
    riskLevel: 'medium',
    description: '适用于本院条件限制、需专科/高级影像/手术转诊。',
    content: `${commonHeader}一、转诊原因\n转诊原因：设备条件__________    专科能力__________    重症监护__________    宠主要求__________    其他__________。\n\n二、告知事项\n1. 继续在本院治疗可能存在诊断或治疗能力限制，转诊可获得更匹配的检查或治疗条件。\n2. 转诊途中可能发生病情变化，宠主需自行承担途中护理和运输风险，必要时建议医疗转运。\n3. 本院可提供现有病历、检查结果和用药记录供接诊医院参考。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_REFUSAL_TREATMENT',
    name: '拒绝/延迟检查治疗告知书',
    category: 'refusal',
    riskLevel: 'high',
    description: '适用于宠主拒绝建议检查、治疗、住院、手术或转诊。',
    content: `${commonHeader}一、医生建议\n医生建议项目：________________________________________。\n\n二、宠主选择\n本人选择拒绝/延迟：检查__________    治疗__________    住院__________    手术__________    转诊__________。\n\n三、风险告知\n1. 拒绝或延迟可能导致病情加重、诊断延误、治疗窗口错过、费用增加、预后变差甚至死亡。\n2. 宠主已知晓替代方案及可能后果，并愿意承担相应风险。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_HOME_CARE',
    name: '居家护理与带药离院告知书',
    category: 'homecare',
    riskLevel: 'medium',
    description: '适用于出院、门诊治疗后居家用药护理。',
    content: `${commonHeader}一、居家护理事项\n1. 请按医嘱用药、复查、限制活动、佩戴头套、观察饮食饮水、排尿排便和精神状态。\n2. 若出现呼吸困难、持续呕吐腹泻、抽搐、伤口裂开、出血、无法进食、精神极差等情况，应立即复诊。\n3. 居家护理不到位可能导致病情反复、感染、伤口问题或治疗失败。\n\n二、复查时间\n建议复查日期：____年__月__日。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_CHRONIC_MANAGEMENT',
    name: '慢性病长期管理告知书',
    category: 'chronic',
    riskLevel: 'medium',
    description: '适用于肾病、心脏病、糖尿病、皮肤病、内分泌疾病等长期管理。',
    content: `${commonHeader}一、慢病名称\n慢性病/长期管理问题：________________________________________。\n\n二、告知事项\n1. 慢性病通常需要长期复查、用药调整、饮食管理和家庭监测，短期好转不代表治愈。\n2. 未按计划复查或自行停药，可能导致病情反复、急性加重或不可逆损伤。\n3. 医生会根据复查指标和临床表现调整方案，费用和治疗周期可能随病情变化。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_RECHECK_DELAY',
    name: '未按期复查风险告知书',
    category: 'homecare',
    riskLevel: 'medium',
    description: '适用于术后、慢病、重症恢复期复查提醒与风险告知。',
    content: `${commonHeader}一、应复查事项\n建议复查项目：________________________________________。\n建议复查日期：____年__月__日。\n\n二、风险告知\n未按期复查可能导致伤口问题、指标异常、药物副作用、病情复发或治疗方案不及时调整。宠主若因自身原因延迟复查，应密切观察异常并承担由此产生的风险。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_GROOMING',
    name: '美容洗护服务告知书',
    category: 'grooming',
    riskLevel: 'low',
    description: '适用于洗澡、美容、剃毛、剪甲、清耳等非医疗服务。',
    content: `${commonHeader}一、服务项目\n洗澡__________    剃毛__________    修剪造型__________    剪甲__________    清耳__________    其他__________。\n\n二、风险告知\n1. 美容洗护可能出现应激、挣扎、皮肤发红、轻微划伤、毛结剃除后皮肤暴露、耳道不适等情况。\n2. 对攻击性、极度紧张、老年、心肺疾病或皮肤病宠物，服务风险增加，必要时建议先医疗评估。\n3. 严重打结可能无法保留毛发长度，需按安全原则剃除。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_BOARDING',
    name: '寄养看护告知书',
    category: 'boarding',
    riskLevel: 'medium',
    description: '适用于短期寄养、日间看护、医疗寄养。',
    content: `${commonHeader}一、寄养信息\n寄养开始：____年__月__日    预计结束：____年__月__日。\n\n二、风险告知\n1. 寄养期间宠物可能因环境变化出现应激、食欲下降、吠叫、腹泻、抓咬、逃逸尝试等情况。\n2. 若寄养期间出现疾病或意外，医院将联系宠主并按授权范围处理。\n3. 宠主需如实告知疫苗、驱虫、传染病史、攻击史、饮食禁忌和用药情况。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_EUTHANASIA',
    name: '安乐处理知情告知书',
    category: 'euthanasia',
    riskLevel: 'critical',
    description: '适用于安乐处理前的严肃告知与确认。',
    content: `${commonHeader}一、决定确认\n宠主已充分了解宠物当前病情、预后、可选治疗方案及安宁照护选择，经慎重考虑，自愿申请安乐处理。\n\n二、告知事项\n1. 安乐处理完成后不可逆，宠主确认该决定真实、自愿、清醒，并已与家庭成员充分沟通。\n2. 处理过程中可能先进行镇静或建立静脉通路，完成后医院会确认生命体征消失。\n3. 遗体处理方式：宠主带回__________    单独火化__________    集体处理__________    其他__________。\n${commonFooter}`,
  },
  {
    code: 'CONSENT_BODY_HANDLING',
    name: '遗体处理告知书',
    category: 'euthanasia',
    riskLevel: 'medium',
    description: '适用于死亡后遗体交接、火化、集体处理等。',
    content: `${commonHeader}一、遗体处理选择\n宠主带回__________    单独火化__________    集体处理__________    其他__________。\n\n二、告知事项\n1. 遗体交接后，若选择第三方殡葬服务，具体流程、时间、费用和证明以服务方规则为准。\n2. 涉及传染病风险的遗体需按防疫要求处理，不建议自行带回或随意掩埋。\n3. 宠主确认遗体处理方式并承担相应费用。\n${commonFooter}`,
  },
]

const categories: Array<[string, string, number]> = [
  ['examination', '基础/专项检查', 1],
  ['lab', '化验采样', 2],
  ['imaging', '影像检查', 3],
  ['anesthesia', '麻醉镇静', 4],
  ['surgery', '手术治疗', 5],
  ['dental', '口腔治疗', 6],
  ['hospitalization', '住院监护', 7],
  ['emergency', '急危重症', 8],
  ['treatment', '治疗处置', 9],
  ['medication', '特殊用药', 10],
  ['transfusion', '输血血制品', 11],
  ['vaccination', '疫苗接种', 12],
  ['prevention', '预防保健', 13],
  ['isolation', '传染病隔离', 14],
  ['referral', '转诊', 15],
  ['refusal', '拒绝/延迟治疗', 16],
  ['homecare', '居家护理', 17],
  ['chronic', '慢病管理', 18],
  ['grooming', '美容洗护', 19],
  ['boarding', '寄养看护', 20],
  ['euthanasia', '安乐/遗体处理', 21],
  ['other', '其他', 99],
]

export class SeedVpetCompleteConsentTemplates1718000000024 implements MigrationInterface {
  name = 'SeedVpetCompleteConsentTemplates1718000000024'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.upsertDict(queryRunner, 'vpet_consent_category', '告知书场景', '宠物诊疗风险告知场景', categories)

    for (const template of templates) {
      await queryRunner.query(
        `INSERT INTO vpet_consent_template
          (code, name, category, species_scope, risk_level, content, variables, description, is_active)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          category = VALUES(category),
          species_scope = VALUES(species_scope),
          risk_level = VALUES(risk_level),
          content = VALUES(content),
          variables = VALUES(variables),
          description = VALUES(description),
          is_active = 1`,
        [
          template.code,
          template.name,
          template.category,
          template.riskLevel,
          template.content,
          JSON.stringify([
            { key: 'ownerName', label: '宠主姓名', placeholder: '__________' },
            { key: 'ownerPhone', label: '联系电话', placeholder: '__________' },
            { key: 'petName', label: '宠物姓名', placeholder: '__________' },
            { key: 'visitNo', label: '就诊编号', placeholder: '__________' },
            { key: 'doctorName', label: '告知医生', placeholder: '__________' },
            { key: 'date', label: '告知日期', placeholder: '____年__月__日' },
          ]),
          template.description,
        ],
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = templates.map(template => template.code)
    if (!codes.length)
      return
    await queryRunner.query(
      `DELETE FROM vpet_consent_template WHERE code IN (${codes.map(() => '?').join(',')})`,
      codes,
    )
  }

  private async upsertDict(queryRunner: QueryRunner, code: string, name: string, remark: string, items: Array<[string, string, number]>): Promise<void> {
    await queryRunner.query(
      `INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
       SELECT ?, ?, 1, ?, 1, 1, NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = ?)`,
      [name, code, remark, code],
    )
    await queryRunner.query(
      `UPDATE sys_dict_type SET name = ?, status = 1, remark = ?, updated_at = NOW() WHERE code = ?`,
      [name, remark, code],
    )
    const typeRows = await queryRunner.query(`SELECT id FROM sys_dict_type WHERE code = ? LIMIT 1`, [code])
    const typeId = typeRows?.[0]?.id
    if (!typeId)
      return
    for (const [value, label, orderNo] of items) {
      await queryRunner.query(
        `INSERT INTO sys_dict_item (type_id, label, value, status, orderNo, remark, create_by, update_by, created_at, updated_at)
         SELECT ?, ?, ?, 1, ?, ?, 1, 1, NOW(), NOW()
         FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE type_id = ? AND value = ?)`,
        [typeId, label, value, orderNo, label, typeId, value],
      )
      await queryRunner.query(
        `UPDATE sys_dict_item
         SET label = ?, status = 1, orderNo = ?, remark = ?, updated_at = NOW()
         WHERE type_id = ? AND value = ?`,
        [label, orderNo, label, typeId, value],
      )
    }
  }
}
