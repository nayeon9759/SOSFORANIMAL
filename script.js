document.addEventListener("DOMContentLoaded", () => {
 // Google Apps Script URL (고객님 링크 유지)
 const API_URL = 'https://script.google.com/macros/s/AKfycbzd7atjDCME61bCi_7TuToK6CNZxckI7bqReZt6p7b_oq6TRW_TiwbQGlLWnlsXihRJDA/exec';

 const form = document.getElementById("petSurveyForm");
 const msg = document.getElementById("msg");
 const submissionsList = document.getElementById("submissionsList");
 const regionOtherInput = document.querySelector('input[name="regionOther"]');
 const tabBtns = document.querySelectorAll(".tab-btn");

 let localSubmissions = []; // 서버에서 불러온 전체 데이터

 // ⭐️ 1. 핵심 수정: Sheets의 실제 열 이름 (Mood, Content, Reaction)을 Key로 사용 ⭐️
 // Sheets에서 이 이름으로 데이터를 읽어옵니다.
 const keyMap = {
  hasPet: "반려동물 보유",
  region: "지역",
  regionOther: "직접 입력 지역",
  Mood: "병원 선택 기준",      // Sheets 열 (폼: priorityCriteria)
  Content: "최대 지불 의향",    // Sheets 열 (폼: concernAndFeature)
  Reaction: "불만/필요 기능",   // Sheets 열 (폼: priceRange)
  priority1: "1순위 정보",
  priority2: "2순위 정보",
 };

 // ⭐️ 2. 표시할 3개 핵심 항목을 Sheets의 열 이름으로 정의 ⭐️
 const displayKeys = ["Mood", "Reaction"];

 /**
 * 1. 서버에서 최신 데이터를 가져와 localSubmissions를 갱신하고, 화면을 다시 그리는 핵심 함수
 */
 const fetchSubmissions = async () => {
  try {
   const uniqueApiUrl = `${API_URL}?t=${new Date().getTime()}`;
   submissionsList.innerHTML = '<div class="placeholder">제출된 기록을 불러오는 중입니다...</div>';

   const res = await fetch(uniqueApiUrl);
   if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  
   const data = await res.json();
  
   if (Array.isArray(data)) {
    localSubmissions = data;
    renderSubmissions(); // 목록 갱신
   } else {
    submissionsList.innerHTML = '<div class="placeholder">데이터 로딩 실패: 서버 응답 형식이 올바르지 않습니다.</div>';
   }
  } catch (error) {
   console.error("서버 데이터 로딩 오류:", error);
   submissionsList.innerHTML = '<div class="placeholder">네트워크 오류 또는 서버 오류로 데이터를 불러올 수 없습니다.</div>';
  }
 };


 // 2. 폼 제출 (POST 후, 전체 데이터 재요청 로직 포함)
 form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "✅ 제출 중...";

  const data = new FormData(form);
  const payload = {};
  for (const [k, v] of data.entries()) payload[k] = v;

  try {
   await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
   });

   msg.textContent = "💌 제출이 완료되었습니다! 의견 목록을 갱신합니다.";
  
   await fetchSubmissions();

   form.reset();
   regionOtherInput.style.display = "none";
  
   // '다른 사람 의견 보기' 탭으로 자동 전환 및 활성화
   document.querySelector('.tab-btn[data-target="submissions"]').click();

  } catch (error) {
   msg.textContent = "⚠️ 서버 응답 오류 발생. 데이터 갱신을 시도합니다.";
   await fetchSubmissions();
   document.querySelector('.tab-btn[data-target="submissions"]').click();
  }
 });

 // 3. submissions 렌더링
 const renderSubmissions = () => {
  submissionsList.innerHTML = "";
 
  if (localSubmissions.length === 0) {
    submissionsList.innerHTML = '<div class="placeholder">아직 제출된 기록이 없습니다.</div>';
    return;
  }
 
  // 중복 렌더링 방지 및 최신 10개만 표시 (slice().reverse().slice(0, 10))
  localSubmissions.slice().reverse().slice(0, 10).forEach((sub, index) => {
   const card = document.createElement("div");
   card.className = "record fade-in";
   card.style.setProperty('--delay', `${index * 0.05}s`);

   // ⭐️ displayKeys(Mood, Content, Reaction)만 순회하며 렌더링
   let html = displayKeys
     .map(k => {
       // keyMap에서 Sheets 열 이름(k)에 맞는 레이블을 가져옵니다.
       const label = keyMap[k];
       let value = sub[k]; // Sheets에서 읽어온 값
      
       // ⭐️ 레거시 맵을 제거했습니다. GAS에서 데이터가 올바르게 기록되므로 필요 없습니다. ⭐️
      
       // 최종 값이 없거나 빈 문자열이면 "응답 없음"을 표시
       const displayValue = (value && value !== "" && value !== " ") ? value : "응답 없음";
      
       // 스타일링 코드 유지
       return `<div class="record-item">
         <strong>${label}:</strong>
         <span class="${displayValue === '응답 없음' ? 'text-muted' : 'text-accent'}">${displayValue}</span>
        </div>`;
     })
    .join("");
   
   if (!html) html = "<div>제출된 정보 없음</div>";
   card.innerHTML = html;
   submissionsList.appendChild(card);
  });
 };

 // 4. 탭 클릭 이벤트 (기존 유지)
 tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
   tabBtns.forEach(b => b.classList.remove("active"));
   document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  
   btn.classList.add("active");
   document.getElementById(btn.dataset.target).classList.add("active");

   // submissions 탭이 활성화될 때만 fetchSubmissions 호출
   if (btn.dataset.target === "submissions") {
    fetchSubmissions();
   }
  });
 });

 // 5. "기타" 입력 토글 (기존 유지)
 document.querySelectorAll('input[name="region"]').forEach(radio => {
  radio.addEventListener('change', () => {
   if (radio.value === "기타") {
    regionOtherInput.style.display = "block";
    regionOtherInput.required = true;
   } else {
    regionOtherInput.style.display = "none";
    regionOtherInput.required = false;
   }
  });
 });
});