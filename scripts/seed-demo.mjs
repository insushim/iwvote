/**
 * 데모용 시드 데이터 생성 스크립트
 * 실행: cd functions && node ../scripts/seed-demo.mjs
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fnRequire = createRequire(join(__dirname, '..', 'functions', 'node_modules', 'x.js'));

const admin = fnRequire('firebase-admin');
const crypto = await import('crypto');
const CryptoJS = fnRequire('crypto-js');

// ── Config ──
import { readFileSync } from 'fs';

// 서비스 계정 키: 환경변수 또는 프로젝트 루트의 키 파일
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || join(__dirname, '..', 'english-class-e059f-firebase-adminsdk-fbsvc-c2246ab29e.json');
const SERVICE_ACCOUNT = JSON.parse(readFileSync(saPath, 'utf-8'));

// 시크릿: Firebase Cloud Functions에 설정된 값과 동일해야 함
// 실행 전 환경변수로 설정하세요:
//   export VOTE_HMAC_SECRET=your_hmac_secret
//   export VOTE_ENCRYPTION_KEY=your_encryption_key_32bytes
const HMAC_SECRET = process.env.VOTE_HMAC_SECRET;
const ENCRYPTION_KEY = process.env.VOTE_ENCRYPTION_KEY;
if (!HMAC_SECRET || !ENCRYPTION_KEY) {
  console.error('❌ 환경변수 VOTE_HMAC_SECRET, VOTE_ENCRYPTION_KEY를 설정해주세요.');
  process.exit(1);
}
const VOTE_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const VOTE_CODE_LENGTH = 6;

admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

// ── Helpers ──
function generateCode() {
  const bytes = crypto.randomBytes(VOTE_CODE_LENGTH);
  return Array.from(bytes).map(b => VOTE_CODE_CHARSET[b % VOTE_CODE_CHARSET.length]).join('');
}

function hashCode(code) {
  return CryptoJS.HmacSHA256(code, HMAC_SECRET).toString();
}

function encryptVote(candidateId) {
  const keyHash = CryptoJS.SHA256(ENCRYPTION_KEY);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(candidateId, keyHash, {
    iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

function sha256(...parts) {
  return CryptoJS.SHA256(parts.join('|')).toString();
}

function now() { return Timestamp.now(); }
function ago(minutes) { return Timestamp.fromDate(new Date(Date.now() - minutes * 60000)); }

// ── Seed Data ──
async function seed() {
  console.log('🗳️  데모 시드 데이터 생성 시작...\n');

  // 1. 기존 데모 데이터 정리
  const existingSchools = await db.collection('schools').where('name', '==', '해나루초등학교').get();
  if (!existingSchools.empty) {
    const schoolId = existingSchools.docs[0].id;
    console.log('⚠️  기존 데모 데이터 삭제 중...');
    // Delete elections, votes, voterCodes, hashChain, auditLogs for this school
    for (const col of ['elections', 'votes', 'voterCodes', 'hashChain', 'auditLogs']) {
      const snap = await db.collection(col).where('schoolId', '==', schoolId).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    }
    await db.collection('schools').doc(schoolId).delete();
    // Delete demo user
    const users = await db.collection('users').where('schoolId', '==', schoolId).get();
    const ub = db.batch();
    users.docs.forEach(d => ub.delete(d.ref));
    if (!users.empty) await ub.commit();
    console.log('  ✓ 기존 데모 데이터 삭제 완료\n');
  }

  // 2. 학교 생성
  const schoolRef = db.collection('schools').doc();
  const schoolId = schoolRef.id;
  await schoolRef.set({
    name: '해나루초등학교',
    grades: [4, 5, 6],
    classesPerGrade: { 4: 3, 5: 3, 6: 3 },
    studentsPerClass: {
      '4-1': 28, '4-2': 27, '4-3': 28,
      '5-1': 30, '5-2': 29, '5-3': 30,
      '6-1': 30, '6-2': 31, '6-3': 30,
    },
    adminIds: [],
    joinCode: 'DEMO2026',
    joinCodeExpiresAt: null,
    createdAt: now(),
    updatedAt: now(),
  });
  console.log(`✓ 학교 생성: 해나루초등학교 (${schoolId})`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. 완료된 선거 (결과 데모용)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const candidates1 = [
    {
      id: 'c1', number: 1, name: '김하늘', grade: 6, classNum: 1, photoURL: '',
      slogan: '모두가 행복한 학교를 만들겠습니다!',
      pledges: ['매주 학생 건의함 설치 및 답변', '쉬는 시간 놀이 공간 확대', '급식 메뉴 학생 투표제 도입'],
    },
    {
      id: 'c2', number: 2, name: '이서준', grade: 6, classNum: 2, photoURL: '',
      slogan: '여러분의 목소리가 곧 학교의 변화!',
      pledges: ['도서관 개방 시간 연장', '학년별 체육대회 개최', '친환경 분리수거 캠페인'],
    },
    {
      id: 'c3', number: 3, name: '박지우', grade: 5, classNum: 1, photoURL: '',
      slogan: '함께 만드는 즐거운 학교!',
      pledges: ['동아리 활동 다양화', '학교 텃밭 가꾸기 프로젝트', '1학년 환영 버디 프로그램'],
    },
  ];

  const election1Ref = db.collection('elections').doc();
  const election1Id = election1Ref.id;
  const targetClasses1 = [];
  for (const g of [4, 5, 6]) for (let c = 1; c <= 3; c++) targetClasses1.push(`${g}-${c}`);

  await election1Ref.set({
    schoolId, title: '2026학년도 전교 어린이 회장 선거',
    type: 'school_president', description: '해나루초등학교 전교 어린이 회장을 선출합니다.',
    targetGrades: [4, 5, 6], targetClasses: targetClasses1,
    candidates: candidates1,
    status: 'closed',
    startTime: ago(120), endTime: ago(10),
    settings: {
      allowAbstention: true, showRealtimeCount: true,
      requireConfirmation: true, maxVotesPerVoter: 1,
      shuffleCandidates: true, showCandidatePhoto: true,
    },
    hashChainHead: null,
    totalVoters: 263, totalVoted: 0,
    createdBy: 'demo-admin', createdAt: ago(180), updatedAt: ago(10),
  });
  console.log(`✓ 선거1 생성: 전교 어린이 회장 선거 (${election1Id})`);

  // 투표 코드 + 투표 + 해시체인 생성
  const voteDistribution = { c1: 98, c2: 112, c3: 45, abstention: 8 };
  const totalVotes = Object.values(voteDistribution).reduce((a, b) => a + b, 0);
  let voteIndex = 0;
  let prevBlockHash = '0';
  let studentNum = {};

  const classCounts = { c1: {}, c2: {}, c3: {}, abstention: {} };
  // Distribute votes across classes
  const classOrder = targetClasses1;
  const votesPerClass = {};
  for (const cls of classOrder) votesPerClass[cls] = [];

  // Build vote list
  const allVotes = [];
  for (const [candId, count] of Object.entries(voteDistribution)) {
    for (let i = 0; i < count; i++) allVotes.push(candId);
  }
  // Shuffle
  for (let i = allVotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allVotes[i], allVotes[j]] = [allVotes[j], allVotes[i]];
  }

  // Assign to classes round-robin
  allVotes.forEach((v, i) => {
    const cls = classOrder[i % classOrder.length];
    votesPerClass[cls].push(v);
  });

  console.log(`  투표 생성 중... (${totalVotes}표)`);

  for (const classId of classOrder) {
    const votes = votesPerClass[classId];
    const [gradeStr, classNumStr] = classId.split('-');
    const grade = parseInt(gradeStr);
    const classNum = parseInt(classNumStr);

    for (let i = 0; i < votes.length; i++) {
      const candidateId = votes[i];
      const code = generateCode();
      const codeHash = hashCode(code);
      const sn = (studentNum[classId] || 0) + 1;
      studentNum[classId] = sn;

      // Voter code (used)
      await db.collection('voterCodes').add({
        electionId: election1Id, schoolId, code, codeHash,
        classId, grade, classNum, studentNumber: sn,
        used: true, usedAt: ago(60 - voteIndex), createdAt: ago(150),
      });

      // Encrypted vote
      const encryptedVote = encryptVote(candidateId);
      const ts = ago(60 - voteIndex);
      const voteHash = sha256(encryptedVote, ts.toMillis().toString(), prevBlockHash);
      const blockHash = sha256(voteIndex.toString(), ts.toMillis().toString(), voteHash, prevBlockHash);

      // Vote document
      await db.collection('votes').add({
        electionId: election1Id, schoolId,
        encryptedVote, voteHash, classId,
        timestamp: ts, verified: true,
      });

      // Hash chain block
      await db.collection('hashChain').add({
        electionId: election1Id, schoolId,
        index: voteIndex, timestamp: ts,
        voteHash, previousHash: prevBlockHash, blockHash, classId,
      });

      prevBlockHash = blockHash;
      voteIndex++;
    }
  }

  // Update election totals
  await election1Ref.update({
    totalVoted: totalVotes,
    hashChainHead: prevBlockHash,
  });

  console.log(`  ✓ ${totalVotes}표 투표 완료 (김하늘:${voteDistribution.c1} / 이서준:${voteDistribution.c2} / 박지우:${voteDistribution.c3} / 기권:${voteDistribution.abstention})`);

  // Audit logs for election 1
  for (const [action, detail, minutesAgo] of [
    ['election_created', '전교 어린이 회장 선거가 생성되었습니다.', 180],
    ['codes_generated', '9개 반에 대한 투표 코드가 생성되었습니다.', 150],
    ['election_started', '투표가 시작되었습니다.', 120],
    ['election_closed', '투표가 종료되었습니다.', 10],
  ]) {
    await db.collection('auditLogs').add({
      electionId: election1Id, schoolId,
      action, actorId: 'demo-admin', details: detail,
      timestamp: ago(minutesAgo), ipHash: '',
    });
  }
  console.log('  ✓ 감사 로그 생성 완료');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. 진행중인 선거 (라이브 데모용)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const candidates2 = [
    {
      id: 'd1', number: 1, name: '최민서', grade: 5, classNum: 2, photoURL: '',
      slogan: '우리 반을 더 따뜻하게!',
      pledges: ['반 친구 생일 축하 이벤트', '학급 문고 50권 채우기', '매주 금요일 보드게임 타임'],
    },
    {
      id: 'd2', number: 2, name: '정우진', grade: 5, classNum: 2, photoURL: '',
      slogan: '약속은 반드시 지킵니다!',
      pledges: ['청소 당번 공정하게 돌아가기', '급식 잔반 줄이기 챌린지', '분쟁 해결 평화 회의 운영'],
    },
  ];

  const election2Ref = db.collection('elections').doc();
  const election2Id = election2Ref.id;

  await election2Ref.set({
    schoolId, title: '5학년 2반 반장 선거',
    type: 'class_president', description: '5학년 2반 반장을 선출합니다.',
    targetGrades: [5], targetClasses: ['5-2'],
    candidates: candidates2,
    status: 'active',
    startTime: ago(30), endTime: null,
    settings: {
      allowAbstention: true, showRealtimeCount: true,
      requireConfirmation: true, maxVotesPerVoter: 1,
      shuffleCandidates: false, showCandidatePhoto: true,
    },
    hashChainHead: null,
    totalVoters: 29, totalVoted: 0,
    createdBy: 'demo-admin', createdAt: ago(60), updatedAt: ago(30),
  });
  console.log(`\n✓ 선거2 생성: 5학년 2반 반장 선거 (${election2Id})`);

  // 일부 투표 (29명 중 18명 투표)
  const votes2 = [];
  for (let i = 0; i < 10; i++) votes2.push('d1');
  for (let i = 0; i < 7; i++) votes2.push('d2');
  votes2.push('abstention');
  // Shuffle
  for (let i = votes2.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [votes2[i], votes2[j]] = [votes2[j], votes2[i]];
  }

  let prevHash2 = '0';
  console.log(`  투표 생성 중... (${votes2.length}/29표)`);

  // Generate all 29 codes, mark 18 as used
  const allCodes2 = [];
  for (let sn = 1; sn <= 29; sn++) {
    const code = generateCode();
    const used = sn <= votes2.length;
    const codeDoc = {
      electionId: election2Id, schoolId, code, codeHash: hashCode(code),
      classId: '5-2', grade: 5, classNum: 2, studentNumber: sn,
      used, usedAt: used ? ago(25 - sn) : null, createdAt: ago(40),
    };
    await db.collection('voterCodes').add(codeDoc);
    if (!used) allCodes2.push(code);
  }

  for (let i = 0; i < votes2.length; i++) {
    const candidateId = votes2[i];
    const encryptedVote = encryptVote(candidateId);
    const ts = ago(25 - i);
    const voteHash = sha256(encryptedVote, ts.toMillis().toString(), prevHash2);
    const blockHash = sha256(i.toString(), ts.toMillis().toString(), voteHash, prevHash2);

    await db.collection('votes').add({
      electionId: election2Id, schoolId,
      encryptedVote, voteHash, classId: '5-2',
      timestamp: ts, verified: true,
    });

    await db.collection('hashChain').add({
      electionId: election2Id, schoolId,
      index: i, timestamp: ts,
      voteHash, previousHash: prevHash2, blockHash, classId: '5-2',
    });

    prevHash2 = blockHash;
  }

  await election2Ref.update({
    totalVoted: votes2.length,
    hashChainHead: prevHash2,
  });

  console.log(`  ✓ ${votes2.length}/29표 투표 완료 (투표율 ${Math.round(votes2.length/29*100)}%)`);
  console.log(`  ✓ 미사용 투표 코드 ${allCodes2.length}개 (라이브 데모용):`);
  allCodes2.forEach((c, i) => console.log(`    ${i+1}. ${c}`));

  // Audit logs for election 2
  for (const [action, detail, minutesAgo] of [
    ['election_created', '5학년 2반 반장 선거가 생성되었습니다.', 60],
    ['codes_generated', '5학년 2반 투표 코드 29개가 생성되었습니다.', 40],
    ['election_started', '투표가 시작되었습니다.', 30],
  ]) {
    await db.collection('auditLogs').add({
      electionId: election2Id, schoolId,
      action, actorId: 'demo-admin', details: detail,
      timestamp: ago(minutesAgo), ipHash: '',
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. 준비중인 선거 (Draft)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const candidates3 = [
    {
      id: 'e1', number: 1, name: '한소율', grade: 6, classNum: 3, photoURL: '',
      slogan: '소통하는 반장이 되겠습니다!',
      pledges: ['학급 SNS 소통 채널 운영', '반 친구 장기자랑 대회'],
    },
    {
      id: 'e2', number: 2, name: '윤도현', grade: 6, classNum: 3, photoURL: '',
      slogan: '행동으로 보여주겠습니다!',
      pledges: ['교실 환경 꾸미기', '학급 규칙 함께 정하기'],
    },
  ];

  const election3Ref = db.collection('elections').doc();
  await election3Ref.set({
    schoolId, title: '6학년 3반 반장 선거',
    type: 'class_president', description: '6학년 3반 반장을 선출합니다.',
    targetGrades: [6], targetClasses: ['6-3'],
    candidates: candidates3,
    status: 'draft',
    startTime: null, endTime: null,
    settings: {
      allowAbstention: true, showRealtimeCount: true,
      requireConfirmation: true, maxVotesPerVoter: 1,
      shuffleCandidates: false, showCandidatePhoto: true,
    },
    hashChainHead: null,
    totalVoters: 0, totalVoted: 0,
    createdBy: 'demo-admin', createdAt: ago(5), updatedAt: ago(5),
  });
  console.log(`\n✓ 선거3 생성: 6학년 3반 반장 선거 (준비중)`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 데모 시드 데이터 생성 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📌 학교: 해나루초등학교`);
  console.log(`   가입 코드: DEMO2026`);
  console.log(`\n📌 선거 3개:`);
  console.log(`   1. 전교 어린이 회장 선거 (종료됨 - 결과 확인 가능)`);
  console.log(`      김하늘: ${voteDistribution.c1}표 / 이서준: ${voteDistribution.c2}표 / 박지우: ${voteDistribution.c3}표 / 기권: ${voteDistribution.abstention}표`);
  console.log(`   2. 5학년 2반 반장 선거 (진행중 - 라이브 투표 가능)`);
  console.log(`      미사용 코드: ${allCodes2.join(', ')}`);
  console.log(`   3. 6학년 3반 반장 선거 (준비중 - 설정 데모용)`);
  console.log(`\n💡 데모 관리자 계정으로 접속하려면:`);
  console.log(`   가입 코드 DEMO2026 으로 회원가입하세요.`);

  process.exit(0);
}

seed().catch(err => { console.error('❌ Error:', err); process.exit(1); });
