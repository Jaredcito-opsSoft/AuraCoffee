import { PrismaClient, PreparationStation, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BrewDesk database seeding...');

  // 1. Business Setting
  await prisma.businessSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      businessName: 'BrewDesk Specialty Coffee & Bakery',
      taxId: 'BDE240620ABC',
      phone: '+52 961 123 4567',
      email: 'hola@brewdesk.mx',
      address: 'Av. Central Poniente 1042, Tuxtla Gutiérrez, Chiapas',
      ticketHeader: '☕ BrewDesk — Café de Especialidad & Tostaduría Local\n¡Bienvenidos!',
      ticketFooter: 'Gracias por apoyar el comercio local chiapaneco.\nSíguenos en @brewdesk.coffee',
      currency: 'MXN',
      taxPercentage: 0,
      suggestedTipPercentages: [10, 15, 20],
      requireOpenCashForOrders: true,
      lowStockAlertEnabled: true,
    },
  });

  // 2. Folio Counters
  await prisma.folioCounter.upsert({
    where: { scope: 'ticket_sale' },
    update: {},
    create: { scope: 'ticket_sale', prefix: 'TKT-', currentValue: 0, padding: 4 },
  });
  await prisma.folioCounter.upsert({
    where: { scope: 'order_command' },
    update: {},
    create: { scope: 'order_command', prefix: 'CMD-', currentValue: 0, padding: 4 },
  });
  await prisma.folioCounter.upsert({
    where: { scope: 'purchase_order' },
    update: {},
    create: { scope: 'purchase_order', prefix: 'OC-', currentValue: 0, padding: 4 },
  });

  // 3. Users with roles & quick PINs
  const users = [
    {
      supabaseUid: 'local-admin-01',
      name: 'Sofía Valenzuela (Admin)',
      email: 'admin@brewdesk.local',
      role: 'admin' as UserRole,
      pinCode: '1234',
    },
    {
      supabaseUid: 'local-manager-01',
      name: 'Carlos Mendoza (Gerente)',
      email: 'gerente@brewdesk.local',
      role: 'manager' as UserRole,
      pinCode: '2222',
    },
    {
      supabaseUid: 'local-cashier-01',
      name: 'Ana Morales (Cajera)',
      email: 'cajero1@brewdesk.local',
      role: 'cashier' as UserRole,
      pinCode: '1111',
    },
    {
      supabaseUid: 'local-barista-01',
      name: 'Mateo Rivas (Head Barista)',
      email: 'barista@brewdesk.local',
      role: 'barista' as UserRole,
      pinCode: '3333',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { pinCode: u.pinCode, role: u.role, name: u.name },
      create: u,
    });
  }

  // 4. Cash Registers
  const reg1 = await prisma.cashRegister.upsert({
    where: { code: 'CAJA-01' },
    update: {},
    create: { code: 'CAJA-01', name: 'Caja Mostrador Principal' },
  });
  await prisma.cashRegister.upsert({
    where: { code: 'BARRA-01' },
    update: {},
    create: { code: 'BARRA-01', name: 'Terminal Barra Rápida' },
  });

  // 5. Table Areas & Tables
  const salon = await prisma.tableArea.upsert({
    where: { id: 1 },
    update: { name: 'Salón Principal' },
    create: { id: 1, name: 'Salón Principal', displayOrder: 1 },
  });
  const terraza = await prisma.tableArea.upsert({
    where: { id: 2 },
    update: { name: 'Terraza Jardín' },
    create: { id: 2, name: 'Terraza Jardín', displayOrder: 2 },
  });

  const tables = [
    { areaId: salon.id, tableNumber: 'M-01', capacity: 2, posX: 50, posY: 50 },
    { areaId: salon.id, tableNumber: 'M-02', capacity: 4, posX: 150, posY: 50 },
    { areaId: salon.id, tableNumber: 'M-03', capacity: 4, posX: 250, posY: 50 },
    { areaId: salon.id, tableNumber: 'M-04', capacity: 6, posX: 350, posY: 50 },
    { areaId: terraza.id, tableNumber: 'T-01', capacity: 2, posX: 50, posY: 150 },
    { areaId: terraza.id, tableNumber: 'T-02', capacity: 4, posX: 150, posY: 150 },
    { areaId: terraza.id, tableNumber: 'BAR-1', capacity: 1, posX: 250, posY: 150 },
    { areaId: terraza.id, tableNumber: 'BAR-2', capacity: 1, posX: 300, posY: 150 },
  ];

  for (const t of tables) {
    const existingTable = await prisma.restaurantTable.findFirst({
      where: { tableNumber: t.tableNumber },
    });
    if (!existingTable) {
      await prisma.restaurantTable.create({ data: t });
    }
  }

  // 6. Inventory Items (Insumos)
  const inventoryData = [
    {
      name: 'Café Grano Chiapas Tostado Medio',
      sku: 'INS-GRA-01',
      category: 'coffee_beans',
      unit: 'g',
      currentStock: 18000,
      minimumStock: 3000,
      costPerUnitCents: 35, // $0.35/g ($350/kg)
    },
    {
      name: 'Café Grano Oaxaca Lavado',
      sku: 'INS-GRA-02',
      category: 'coffee_beans',
      unit: 'g',
      currentStock: 12000,
      minimumStock: 2500,
      costPerUnitCents: 42,
    },
    {
      name: 'Leche Entera Santa Clara',
      sku: 'INS-LEC-ENT',
      category: 'dairy',
      unit: 'ml',
      currentStock: 28000,
      minimumStock: 6000,
      costPerUnitCents: 3, // $0.03/ml ($30/L)
    },
    {
      name: 'Bebida de Avena Barista Edition',
      sku: 'INS-LEC-AVE',
      category: 'dairy',
      unit: 'ml',
      currentStock: 14000,
      minimumStock: 3000,
      costPerUnitCents: 7, // $0.07/ml ($70/L)
    },
    {
      name: 'Bebida de Almendra Sin Azúcar',
      sku: 'INS-LEC-ALM',
      category: 'dairy',
      unit: 'ml',
      currentStock: 10000,
      minimumStock: 2000,
      costPerUnitCents: 6,
    },
    {
      name: 'Jarabe de Vainilla de Papantla',
      sku: 'INS-JAR-VAI',
      category: 'syrups',
      unit: 'ml',
      currentStock: 2500,
      minimumStock: 500,
      costPerUnitCents: 22,
    },
    {
      name: 'Jarabe de Caramelo Mantequilla',
      sku: 'INS-JAR-CAR',
      category: 'syrups',
      unit: 'ml',
      currentStock: 2200,
      minimumStock: 500,
      costPerUnitCents: 22,
    },
    {
      name: 'Polvo Matcha Uji Grado Ceremonial',
      sku: 'INS-MAT-01',
      category: 'kitchen_supplies',
      unit: 'g',
      currentStock: 1200,
      minimumStock: 200,
      costPerUnitCents: 110,
    },
    {
      name: 'Concentrado Especiado Masala Chai',
      sku: 'INS-CHA-01',
      category: 'kitchen_supplies',
      unit: 'ml',
      currentStock: 4000,
      minimumStock: 800,
      costPerUnitCents: 18,
    },
    {
      name: 'Vaso Biodegradable 8oz + Tapa',
      sku: 'INS-VAS-08',
      category: 'disposables',
      unit: 'unit',
      currentStock: 450,
      minimumStock: 100,
      costPerUnitCents: 320, // $3.20
    },
    {
      name: 'Vaso Biodegradable 12oz + Tapa',
      sku: 'INS-VAS-12',
      category: 'disposables',
      unit: 'unit',
      currentStock: 750,
      minimumStock: 150,
      costPerUnitCents: 380,
    },
    {
      name: 'Vaso Biodegradable 16oz + Tapa',
      sku: 'INS-VAS-16',
      category: 'disposables',
      unit: 'unit',
      currentStock: 600,
      minimumStock: 120,
      costPerUnitCents: 450,
    },
    {
      name: 'Croissant Francés Mantequilla',
      sku: 'INS-REP-CRO',
      category: 'kitchen_supplies',
      unit: 'unit',
      currentStock: 30,
      minimumStock: 8,
      costPerUnitCents: 2100, // $21.00
    },
    {
      name: 'Panini Jamón Serrano y Gouda',
      sku: 'INS-ALI-PAN',
      category: 'kitchen_supplies',
      unit: 'unit',
      currentStock: 18,
      minimumStock: 5,
      costPerUnitCents: 4800, // $48.00
    },
  ];

  const inventoryMap = new Map();
  for (const inv of inventoryData) {
    const existing = await prisma.inventoryItem.findFirst({ where: { sku: inv.sku } });
    if (!existing) {
      const created = await prisma.inventoryItem.create({ data: inv });
      inventoryMap.set(inv.sku, created);
    } else {
      inventoryMap.set(inv.sku, existing);
    }
  }

  // 7. Modifiers & Modifier Groups
  const modGroupLeches = await prisma.modifierGroup.create({
    data: {
      name: 'Tipo de Leche',
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
      displayOrder: 1,
      modifiers: {
        create: [
          { name: 'Leche Entera (Estándar)', extraPriceCents: 0, displayOrder: 1 },
          { name: 'Leche Deslactosada', extraPriceCents: 0, displayOrder: 2 },
          {
            name: 'Leche de Avena Barista (+ $15)',
            extraPriceCents: 1500,
            inventoryItemId: inventoryMap.get('INS-LEC-AVE')?.id,
            deductQuantity: 200,
            displayOrder: 3,
          },
          {
            name: 'Leche de Almendra (+ $15)',
            extraPriceCents: 1500,
            inventoryItemId: inventoryMap.get('INS-LEC-ALM')?.id,
            deductQuantity: 200,
            displayOrder: 4,
          },
        ],
      },
    },
  });

  const modGroupJarabes = await prisma.modifierGroup.create({
    data: {
      name: 'Jarabes & Sabores',
      minSelect: 0,
      maxSelect: 2,
      isRequired: false,
      displayOrder: 2,
      modifiers: {
        create: [
          {
            name: 'Vainilla Natural (+ $12)',
            extraPriceCents: 1200,
            inventoryItemId: inventoryMap.get('INS-JAR-VAI')?.id,
            deductQuantity: 25,
            displayOrder: 1,
          },
          {
            name: 'Caramelo Salado (+ $12)',
            extraPriceCents: 1200,
            inventoryItemId: inventoryMap.get('INS-JAR-CAR')?.id,
            deductQuantity: 25,
            displayOrder: 2,
          },
        ],
      },
    },
  });

  const modGroupEspresso = await prisma.modifierGroup.create({
    data: {
      name: 'Extras de Espresso',
      minSelect: 0,
      maxSelect: 2,
      isRequired: false,
      displayOrder: 3,
      modifiers: {
        create: [
          {
            name: 'Shot Extra Espresso (+ $15)',
            extraPriceCents: 1500,
            inventoryItemId: inventoryMap.get('INS-GRA-01')?.id,
            deductQuantity: 18,
            displayOrder: 1,
          },
          {
            name: 'Cambio a Grano Oaxaca (+ $10)',
            extraPriceCents: 1000,
            displayOrder: 2,
          },
        ],
      },
    },
  });

  // 8. Categories
  const catCaliente = await prisma.category.upsert({
    where: { slug: 'cafe-caliente' },
    update: {},
    create: {
      name: 'Café Caliente',
      slug: 'cafe-caliente',
      description: 'Extracciones clásicas de espresso y barismo artesanal',
      colorHex: '#D97706',
      iconName: 'Coffee',
      displayOrder: 1,
    },
  });

  const catFrio = await prisma.category.upsert({
    where: { slug: 'cafe-frio-coldbrew' },
    update: {},
    create: {
      name: 'Café Frío & Cold Brew',
      slug: 'cafe-frio-coldbrew',
      description: 'Bebidas frías, maceradas en frío y preparaciones sobre hielo',
      colorHex: '#0284C7',
      iconName: 'Snowflake',
      displayOrder: 2,
    },
  });

  const catTes = await prisma.category.upsert({
    where: { slug: 'tes-infusiones' },
    update: {},
    create: {
      name: 'Matcha & Tés',
      slug: 'tes-infusiones',
      description: 'Matcha ceremonial, tisanas y blends aromáticos',
      colorHex: '#059669',
      iconName: 'Leaf',
      displayOrder: 3,
    },
  });

  const catPanaderia = await prisma.category.upsert({
    where: { slug: 'reposteria-panaderia' },
    update: {},
    create: {
      name: 'Repostería',
      slug: 'reposteria-panaderia',
      description: 'Piezas artesanales horneadas diariamente',
      colorHex: '#D97706',
      iconName: 'Cake',
      displayOrder: 4,
    },
  });

  const catAlimentos = await prisma.category.upsert({
    where: { slug: 'alimentos-paninis' },
    update: {},
    create: {
      name: 'Alimentos & Paninis',
      slug: 'alimentos-paninis',
      description: 'Sándwiches calientes, ensaladas y tostadas',
      colorHex: '#E11D48',
      iconName: 'Utensils',
      displayOrder: 5,
    },
  });

  // 9. Products with Variants, Modifiers and Recipes (BOM)
  // Product 1: Espresso Doble
  const pEspresso = await prisma.product.create({
    data: {
      categoryId: catCaliente.id,
      name: 'Espresso Doble Especial',
      slug: 'espresso-doble-especial',
      description: 'Doble extracción (1:2 ratio, 36g líquido) con notas a chocolate y avellana',
      sku: 'PRD-ESP-01',
      hasVariants: false,
      basePriceCents: 3800, // $38.00
      baseCostCents: 750,
      preparationStation: 'barista_hot' as PreparationStation,
      isFavorite: true,
      displayOrder: 1,
      modifierGroupLinks: {
        create: [{ modifierGroupId: modGroupEspresso.id }],
      },
      recipes: {
        create: {
          name: 'Receta Espresso Doble',
          instructions: '18g in, 36g out, tiempo 27-30s a 93°C',
          ingredients: {
            create: [
              {
                inventoryItemId: inventoryMap.get('INS-GRA-01')!.id,
                quantity: 18,
                lossPercentage: 5,
              },
            ],
          },
        },
      },
    },
  });

  // Product 2: Flat White (8oz)
  await prisma.product.create({
    data: {
      categoryId: catCaliente.id,
      name: 'Flat White Australiano (8oz)',
      slug: 'flat-white-8oz',
      description: 'Doble ristretto con microespuma de leche sedosa y delgada capa de crema',
      sku: 'PRD-FLA-01',
      hasVariants: false,
      basePriceCents: 6200, // $62.00
      baseCostCents: 1400,
      preparationStation: 'barista_hot' as PreparationStation,
      isFavorite: true,
      displayOrder: 2,
      modifierGroupLinks: {
        create: [
          { modifierGroupId: modGroupLeches.id },
          { modifierGroupId: modGroupJarabes.id },
          { modifierGroupId: modGroupEspresso.id },
        ],
      },
      recipes: {
        create: {
          name: 'Receta Flat White 8oz',
          ingredients: {
            create: [
              { inventoryItemId: inventoryMap.get('INS-GRA-01')!.id, quantity: 18 },
              { inventoryItemId: inventoryMap.get('INS-LEC-ENT')!.id, quantity: 150 },
              { inventoryItemId: inventoryMap.get('INS-VAS-08')!.id, quantity: 1 },
            ],
          },
        },
      },
    },
  });

  // Product 3: Café Latte (With Variants: 12oz & 16oz)
  await prisma.product.create({
    data: {
      categoryId: catCaliente.id,
      name: 'Café Latte de la Casa',
      slug: 'cafe-latte-casa',
      description: 'Espresso con abundante leche emulsionada cremosa',
      sku: 'PRD-LAT-01',
      hasVariants: true,
      basePriceCents: 6500,
      baseCostCents: 1600,
      preparationStation: 'barista_hot' as PreparationStation,
      isFavorite: true,
      displayOrder: 3,
      variants: {
        create: [
          { name: 'Mediano (12oz)', sku: 'PRD-LAT-12OZ', priceCents: 6500, costCents: 1600, displayOrder: 1 },
          { name: 'Grande (16oz)', sku: 'PRD-LAT-16OZ', priceCents: 7500, costCents: 2100, displayOrder: 2 },
        ],
      },
      modifierGroupLinks: {
        create: [
          { modifierGroupId: modGroupLeches.id },
          { modifierGroupId: modGroupJarabes.id },
          { modifierGroupId: modGroupEspresso.id },
        ],
      },
    },
  });

  // Product 4: Cold Brew Signature (16oz)
  await prisma.product.create({
    data: {
      categoryId: catFrio.id,
      name: 'Cold Brew Macerado 18h',
      slug: 'cold-brew-18h',
      description: 'Extracción en frío durante 18 horas, perfil dulce, suave y baja acidez',
      sku: 'PRD-CLD-01',
      hasVariants: false,
      basePriceCents: 7000, // $70.00
      baseCostCents: 1800,
      preparationStation: 'barista_cold' as PreparationStation,
      isFavorite: true,
      displayOrder: 1,
      modifierGroupLinks: {
        create: [
          { modifierGroupId: modGroupLeches.id },
          { modifierGroupId: modGroupJarabes.id },
        ],
      },
      recipes: {
        create: {
          name: 'Receta Cold Brew 16oz',
          ingredients: {
            create: [
              { inventoryItemId: inventoryMap.get('INS-GRA-01')!.id, quantity: 28 },
              { inventoryItemId: inventoryMap.get('INS-VAS-16')!.id, quantity: 1 },
            ],
          },
        },
      },
    },
  });

  // Product 5: Matcha Latte Ceremonial
  await prisma.product.create({
    data: {
      categoryId: catTes.id,
      name: 'Matcha Latte Ceremonial Uji',
      slug: 'matcha-latte-uji',
      description: 'Matcha japonés batido tradicional con batidor de bambú chasen',
      sku: 'PRD-MAT-01',
      hasVariants: true,
      basePriceCents: 7800,
      baseCostCents: 2200,
      preparationStation: 'barista_hot' as PreparationStation,
      isFavorite: true,
      displayOrder: 1,
      variants: {
        create: [
          { name: 'Caliente (12oz)', priceCents: 7800, costCents: 2200, displayOrder: 1 },
          { name: 'Iced con Hielo (16oz)', priceCents: 8500, costCents: 2500, displayOrder: 2 },
        ],
      },
      modifierGroupLinks: {
        create: [
          { modifierGroupId: modGroupLeches.id },
          { modifierGroupId: modGroupJarabes.id },
        ],
      },
    },
  });

  // Product 6: Croissant Francés de Mantequilla
  await prisma.product.create({
    data: {
      categoryId: catPanaderia.id,
      name: 'Croissant Francés de Mantequilla',
      slug: 'croissant-mantequilla',
      description: 'Hojaldrado artesanal con 100% mantequilla pura de vaca',
      sku: 'PRD-CRO-01',
      hasVariants: false,
      basePriceCents: 4800, // $48.00
      baseCostCents: 2100,
      preparationStation: 'bakery_direct' as PreparationStation,
      isFavorite: true,
      displayOrder: 1,
      recipes: {
        create: {
          name: 'Croissant directo',
          ingredients: {
            create: [{ inventoryItemId: inventoryMap.get('INS-REP-CRO')!.id, quantity: 1 }],
          },
        },
      },
    },
  });

  // Product 7: Panini Jamón Serrano y Gouda
  await prisma.product.create({
    data: {
      categoryId: catAlimentos.id,
      name: 'Panini Serrano, Gouda y Pesto',
      slug: 'panini-serrano-gouda',
      description: 'Pan ciabatta rústico tostado al grill con jamón serrano y pesto artesanal',
      sku: 'PRD-PAN-01',
      hasVariants: false,
      basePriceCents: 12500, // $125.00
      baseCostCents: 4800,
      preparationStation: 'kitchen' as PreparationStation,
      isFavorite: true,
      displayOrder: 1,
      recipes: {
        create: {
          name: 'Panini al grill',
          instructions: 'Pesar en plancha panini a 200°C por 4 minutos hasta dorar',
          ingredients: {
            create: [{ inventoryItemId: inventoryMap.get('INS-ALI-PAN')!.id, quantity: 1 }],
          },
        },
      },
    },
  });

  // 10. Initial Customers (Loyalty)
  await prisma.customer.upsert({
    where: { phone: '9611234567' },
    update: {},
    create: {
      name: 'Mariana Gómez',
      phone: '9611234567',
      email: 'mariana.gomez@gmail.com',
      loyaltyPoints: 120,
      visitCount: 14,
      notes: 'Prefiere leche de avena tibia, poco dulce',
    },
  });

  await prisma.customer.upsert({
    where: { phone: '9619876543' },
    update: {},
    create: {
      name: 'Roberto Domínguez',
      phone: '9619876543',
      email: 'roberto.d@empresa.com',
      loyaltyPoints: 45,
      visitCount: 5,
      notes: 'Cliente frecuente matutino, pide Flat White',
    },
  });

  console.log('✅ BrewDesk seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
