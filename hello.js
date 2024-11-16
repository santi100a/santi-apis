const ids = [  
  {
    _id: ObjectId('66bc1c6b1a7d446580381492'),
    id: '3c5fcff3-5675-48bc-8227-f48f15f0628c',
    amount: 56000000,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: 'Cobro en Plataforma',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd20fff4242f4c84ef59a9'),
    id: 'e151b2f7-df2b-4f40-9916-6071754f74c8',
    amount: 50000,
    error: null,
    payee: '017968374869736',
    payer: '115496347979887',
    purpose: 'Salario Mensual',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd2720f4242f4c84fff742'),
    id: '0a9776f4-446b-4825-836f-47bf1a7453cb',
    amount: 1000000,
    error: null,
    payee: '017968374869736',
    payer: '115496347979887',
    purpose: 'Premio de Concurso MusicMath',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd30a5f4242f4c84197f6f'),
    id: '62237170-3f5e-40ce-9371-8c1d18323765',
    amount: 20000,
    error: null,
    payee: '012939292920110',
    payer: '115496347979887',
    purpose: 'Recompensa Militar',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd3105f4242f4c841a7fbc'),
    id: '96dbabae-3725-429c-b019-e2a0dcf3c008',
    amount: 18500,
    error: null,
    payee: '012020242202011',
    payer: '115496347979887',
    purpose: 'Recompensa Militar',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd3301f4242f4c841fcf9f'),
    id: 'd62a2aa7-14dc-4dc5-a358-c3691f09f53c',
    amount: 32658451.43,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] [GCS] Withdrawal - February 4, 2024 (ISP 10,885.48)',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd33d3f4242f4c8421fa1c'),
    id: 'fe94b3a9-e27f-4089-b9cb-9ccfbd106da4',
    amount: 30000000,
    error: null,
    payee: 'admin',
    payer: '115496347979887',
    purpose: 'Pago internacional en "Active International Society" (10,000 ISP)',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd3586f4242f4c842679b1'),
    id: '317723ad-ba28-4aaa-838e-5c5370a2b5a8',
    amount: 10000000,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] SAI - Retiro del 29 de Febrero de 2024 - ISP$3,333.33',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd35e5f4242f4c84277675'),
    id: '7f64e4ec-dff0-402a-a3ee-3fd0853349bd',
    amount: 18647970,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] SAI - Retiro del 29 de Marzo de 2024 - ISP$6,215.99',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd3669f4242f4c8428e24b'),
    id: '1f15b2bc-199e-47b0-a679-6bc5b06f192a',
    amount: 14512440,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] SAI - Retiro del 30 de Abril de 2024 - ISP$4,837.48',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd373ef4242f4c842b257d'),
    id: 'cf34310d-e424-4337-88f1-8b844a6ad34c',
    amount: 7352564,
    error: null,
    payee: 'admin',
    payer: '115496347979887',
    purpose: 'Gastos Varios',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd37cbf4242f4c842c9c85'),
    id: '05ae1b3f-2382-4b92-a257-2fce67654b83',
    amount: 3340656,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] SAI - Retiro del 30 de Mayo de 2024 - ISP$1,237.28',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd3834f4242f4c842daff8'),
    id: '3b282ddc-ce02-4959-941b-eadffaedd46a',
    amount: 2714560.23,
    error: null,
    payee: 'admin',
    payer: '115496347979887',
    purpose: 'Gastos Varios',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd38aef4242f4c842ef266'),
    id: '599184fd-90f9-4d04-8bdb-7b6a4beca94a',
    amount: 3052489.19,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] SAI - Retiro del 15 de Junio de 2024 - ISP$1,141.92',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd38f2f4242f4c842fa6e6'),
    id: 'ff459745-a1e2-4f0a-a58d-bebc0c8efb68',
    amount: 9598883.73,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] Ayuda económica',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd3a73f4242f4c84339e8b'),
    id: '56d631fc-71d3-45e6-b8ab-bb68fa1e3855',
    amount: 3123028.21,
    error: null,
    payee: '115496347979887',
    payer: 'admin',
    purpose: '[Banca Internacional] SAI - Retiro del 1 de Julio de 2024 - ISP$1,037.01',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd4a18f4242f4c845d10a7'),
    id: '80412505-feb1-4ac6-8afd-a53869e135f3',
    amount: 10000,
    error: null,
    payee: '014622214208641',
    payer: '115496347979887',
    purpose: 'Recompensa Militar',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66bd4a9ef4242f4c845e71f9'),
    id: '48439165-1e60-4558-a64a-300187a4fd0a',
    amount: 10000,
    error: null,
    payee: '012052397539753',
    payer: '115496347979887',
    purpose: 'Bono por Juego de Fútbol - Martes, 13 de Agosto de 2024',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66ca2f963185e7b302c70fc1'),
    id: '461f000b-7166-47fd-9275-1da669200aa4',
    amount: 34850000,
    error: null,
    payee: '010000000000000',
    payer: '115496347979887',
    purpose: 'Salarios Pendientes',
    status: 'approved',
    datetime: Long('1725685200000')
  },
  {
    _id: ObjectId('66d3dc42c8a5bd4e131cd322'),
    id: '8de98ee2-dbe5-4f79-a420-cb5a87a2afdb',
    amount: 2312849.76,
    error: null,
    payee: '010000000000000',
    payer: '115496347979887',
    purpose: 'Salarios Pendientes',
    status: 'approved',
    datetime: Long('1725685200000')
  }
].map(obj => obj.id);

console.log(ids);

function ObjectId(a) { return a; }
function Long(a) { return a; }
