import { useId } from 'react';

/** Decorative artwork, not an instructional instrument diagram. */
export function InstrumentArt({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      className={`instrument-art ${className}`.trim()}
      viewBox="0 0 620 390"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C88B54" />
          <stop offset="0.5" stopColor="#E4B77B" />
          <stop offset="1" stopColor="#B97745" />
        </linearGradient>
        <linearGradient id={`${id}-drum`} x1="12" y1="16" x2="154" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BD634A" />
          <stop offset="0.5" stopColor="#964A36" />
          <stop offset="1" stopColor="#C87553" />
        </linearGradient>
        <linearGradient id={`${id}-bamboo`} x1="0" y1="0" x2="20" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#69836A" />
          <stop offset="0.45" stopColor="#A6B28C" />
          <stop offset="1" stopColor="#4C6D57" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-50%" width="160%" height="200%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#304C3D" floodOpacity="0.14" />
        </filter>
      </defs>

      <circle cx="356" cy="183" r="153" fill="#E2E9DB" />
      <circle cx="466" cy="102" r="54" fill="#DDA38C" fillOpacity="0.56" />
      <circle cx="142" cy="276" r="66" fill="#D6B76E" fillOpacity="0.25" />
      <path d="M162 322C269 361 432 349 541 285" stroke="#75917A" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="3 9" />
      <path d="M220 76C293 35 394 44 436 68" stroke="#FFFDF6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M522 217C549 186 551 150 536 123" stroke="#B28C4B" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />

      <g className="art-flutes">
        <g transform="translate(176 60) rotate(23)">
          <rect x="0" y="0" width="20" height="208" rx="7" fill={`url(#${id}-bamboo)`} />
          <path d="M4 10V198" stroke="#DCE0B7" strokeOpacity="0.47" strokeWidth="1.5" />
          {[23, 86, 145, 191].map((y) => (
            <g key={y}>
              <path d={`M0 ${y}H20`} stroke="#3E5D45" strokeWidth="3" />
              <path d={`M1 ${y + 3}H19`} stroke="#CCCB9B" strokeWidth="1" />
            </g>
          ))}
          {[46, 70, 102, 122, 160, 178].map((y) => (
            <ellipse key={y} cx="11" cy={y} rx="3.2" ry="4.5" fill="#294B3B" />
          ))}
          <ellipse cx="10" cy="4" rx="7" ry="3" fill="#344F3C" />
        </g>
        <g transform="translate(218 74) rotate(18)">
          <rect x="0" y="0" width="15" height="184" rx="5" fill="#B69C5E" />
          <rect x="3" y="5" width="3" height="171" rx="1.5" fill="#E2CC91" fillOpacity="0.7" />
          {[19, 75, 132, 171].map((y) => <path key={y} d={`M0 ${y}H15`} stroke="#806C3B" strokeWidth="2.5" />)}
          {[42, 59, 94, 111, 150].map((y) => <ellipse key={y} cx="9" cy={y} rx="2.4" ry="3.2" fill="#514B2D" />)}
          <path d="M5 184L4 204M10 184L12 201" stroke="#BC6A4D" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>

      <g className="art-janggu">
        <g transform="translate(400 136) rotate(13 75 65)" filter={`url(#${id}-shadow)`}>
          <path d="M13 15C53 22 47 43 80 46C111 47 117 23 151 17V112C113 108 111 82 80 83C49 84 46 109 13 115Z" fill={`url(#${id}-drum)`} />
          <path d="M15 27C50 34 51 53 79 55C111 55 119 34 149 29M14 100C48 95 53 75 80 74C112 73 117 94 150 100" stroke="#D88E60" strokeWidth="2" strokeOpacity="0.6" />
          <ellipse cx="16" cy="65" rx="23" ry="52" fill="#E9D5AA" stroke="#75452E" strokeWidth="5" />
          <ellipse cx="16" cy="65" rx="17" ry="45" fill="#F3E5C6" stroke="#C7AC7C" strokeWidth="1.5" />
          <ellipse cx="151" cy="65" rx="22" ry="50" fill="#EDDCB9" stroke="#75452E" strokeWidth="5" />
          <ellipse cx="151" cy="65" rx="16" ry="43" fill="#F8EBD1" stroke="#CFB687" strokeWidth="1.5" />
          <g stroke="#F0D9AE" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 17L139 43L27 64L142 91L24 111" />
            <path d="M140 18L29 43L140 65L28 90L141 111" />
            <path d="M28 32L139 54L29 78L140 101" strokeWidth="1.6" />
          </g>
          <path d="M78 43L86 47L84 57L76 54Z" fill="#DCA15E" stroke="#7A4B30" strokeWidth="1" />
          <path d="M77 73L85 76L83 88L75 85Z" fill="#DCA15E" stroke="#7A4B30" strokeWidth="1" />
          <path d="M1 14L122 -9" stroke="#B88C51" strokeWidth="5" strokeLinecap="round" />
          <path d="M7 13L30 9" stroke="#ECD4A5" strokeWidth="5" strokeLinecap="round" />
          <path d="M164 40L187 1" stroke="#77533A" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="187" cy="1" rx="6" ry="9" transform="rotate(29 187 1)" fill="#E7D4B2" />
        </g>
      </g>

      <g className="art-gayageum">
        <g transform="translate(51 259) rotate(-17)" filter={`url(#${id}-shadow)`}>
          <path d="M10 7C87 -2 303 -1 384 8C401 10 412 23 411 43L409 65C408 79 398 88 383 90C291 99 89 97 9 86C1 85 -4 79 -3 70L-1 22C-1 14 3 9 10 7Z" fill="#855233" />
          <path d="M12 0C94 -7 304 -6 383 2C400 4 409 16 408 35L406 58C405 73 396 81 381 83C292 91 91 89 12 79C3 78 -2 72 -1 63L1 15C1 7 5 1 12 0Z" fill={`url(#${id}-wood)`} />
          <path d="M19 6C119 0 280 0 376 7M15 74C129 84 271 83 383 77" stroke="#F1D09D" strokeWidth="1.6" strokeOpacity="0.75" />
          <path d="M43 19C138 12 255 17 350 14M50 59C155 66 257 61 349 64M52 69C153 74 263 70 356 73" stroke="#875335" strokeWidth="1" strokeOpacity="0.2" />
          <path d="M26 5L24 78M372 5L370 84" stroke="#6B472F" strokeWidth="5" />
          <path d="M29 5L27 79M376 5L374 83" stroke="#E0B57E" strokeWidth="1.7" />
          {Array.from({ length: 12 }, (_, index) => {
            const y = 13 + index * 5.3;
            const bridgeX = 137 + index * 7.2;
            return (
              <g key={index}>
                <path d={`M30 ${y + 1}L${bridgeX} ${y - 2}L371 ${y + 1}`} stroke="#774A2E" strokeWidth="1.8" strokeOpacity="0.24" />
                <path d={`M${bridgeX - 5} ${y + 3}L${bridgeX} ${y - 7}L${bridgeX + 6} ${y + 3}`} fill="#755138" stroke="#63452F" strokeWidth="1.1" strokeLinejoin="round" />
                <path d={`M31 ${y}L${bridgeX} ${y - 6}L370 ${y}`} stroke="#F7E5BC" strokeWidth="1.05" />
                <circle cx="16" cy={y} r="1.8" fill="#6C4831" />
                <path d={`M378 ${y}L391 ${y + 2}`} stroke="#6F4930" strokeWidth="2" strokeLinecap="round" />
              </g>
            );
          })}
          <path d="M398 28C404 30 405 45 399 52" stroke="#875335" strokeWidth="2" strokeLinecap="round" />
          <path d="M391 81C389 98 378 97 377 109C373 102 372 92 376 84" fill="#B66B4C" />
          <path d="M381 87L383 111M386 86L389 104" stroke="#E9B88A" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>

      <g className="art-note art-note-one" stroke="#B18C4F" strokeWidth="2.3" strokeLinecap="round">
        <path d="M290 75V52L309 47V69M290 59L309 54" />
        <ellipse cx="286" cy="76" rx="5" ry="3.5" transform="rotate(-18 286 76)" fill="#B18C4F" stroke="none" />
        <ellipse cx="305" cy="70" rx="5" ry="3.5" transform="rotate(-18 305 70)" fill="#B18C4F" stroke="none" />
      </g>
      <g className="art-note art-note-two" stroke="#63826B" strokeWidth="2.2" strokeLinecap="round">
        <path d="M543 284C550 278 553 270 552 262M552 292C563 282 567 270 564 257" />
      </g>
      <g className="art-note art-note-three" fill="#BB775A">
        <circle cx="112" cy="148" r="3.5" />
        <circle cx="323" cy="340" r="3" />
        <path d="M366 91L369 98L376 101L369 104L366 111L363 104L356 101L363 98Z" />
      </g>
      <g stroke="#A18D5A" strokeWidth="1.8" strokeLinecap="round">
        <path d="M94 212V224M88 218H100M510 324V334M505 329H515" />
        <path d="M239 34V40M236 37H242" />
      </g>
    </svg>
  );
}
