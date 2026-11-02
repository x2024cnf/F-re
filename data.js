const CONDITIONS = {
  powder: { label: "Powder", score: 12 },
  groomed: { label: "Groomed", score: 34 },
  crud: { label: "Crud", score: 59 },
  moguls: { label: "Moguls", score: 47 },
  icy: { label: "Icy", score: 91 }
};

const RUNS = [
  { id: "glasswing", name: "Glasswing", difficulty: "Blue", length: "1.4 km", condition: "powder", score: 12, confidence: 88, reports: 38, age: 2, path: "M533 94 C495 133 510 168 461 197 S414 243 427 271 S390 322 363 347", labelX: 447, labelY: 217 },
  { id: "sunspoke", name: "Sunspoke", difficulty: "Green", length: "1.8 km", condition: "groomed", score: 31, confidence: 94, reports: 64, age: 1, path: "M550 101 C584 143 546 171 573 204 S598 253 556 282 S552 336 514 372", labelX: 576, labelY: 263 },
  { id: "quiet-divide", name: "Quiet Divide", difficulty: "Black", length: "1.1 km", condition: "crud", score: 62, confidence: 73, reports: 17, age: 8, path: "M511 111 C465 145 471 176 428 199 S377 237 385 274 S337 311 315 352", labelX: 354, labelY: 300 },
  { id: "hush-hollow", name: "Hush Hollow", difficulty: "Blue", length: "1.6 km", condition: "powder", score: 18, confidence: 82, reports: 29, age: 3, path: "M568 112 C610 153 590 184 618 212 S622 258 588 289 S583 337 556 370", labelX: 618, labelY: 233 },
  { id: "lantern-run", name: "Lantern Run", difficulty: "Green", length: "2.2 km", condition: "groomed", score: 28, confidence: 91, reports: 52, age: 2, path: "M529 126 C496 159 528 188 492 219 S474 262 501 292 S484 335 463 374", labelX: 506, labelY: 319 },
  { id: "foxfire", name: "Foxfire", difficulty: "Black", length: "0.9 km", condition: "icy", score: 89, confidence: 79, reports: 21, age: 5, path: "M494 117 C460 145 443 174 455 204 S421 238 432 266 S398 309 394 351", labelX: 407, labelY: 330 },
  { id: "driftwood", name: "Driftwood", difficulty: "Blue", length: "1.3 km", condition: "crud", score: 54, confidence: 77, reports: 24, age: 7, path: "M579 132 C547 165 560 192 536 222 S518 259 541 288 S527 334 505 384", labelX: 544, labelY: 355 },
  { id: "whitecap", name: "Whitecap Traverse", difficulty: "Blue", length: "2.5 km", condition: "groomed", score: 37, confidence: 86, reports: 31, age: 4, path: "M604 144 C568 153 533 171 498 179 S444 185 405 206 S348 227 308 235", labelX: 365, labelY: 221 },
  { id: "blue-hour", name: "Blue Hour", difficulty: "Black", length: "1.0 km", condition: "moguls", score: 48, confidence: 69, reports: 14, age: 11, path: "M468 124 C438 149 414 169 426 196 S390 223 402 250 S366 289 349 329", labelX: 379, labelY: 281 },
  { id: "long-sunday", name: "Long Sunday", difficulty: "Green", length: "2.8 km", condition: "groomed", score: 26, confidence: 96, reports: 73, age: 1, path: "M600 160 C635 194 616 222 644 249 S634 291 608 318 S609 365 579 403", labelX: 635, labelY: 346 },
  { id: "switchback-vale", name: "Switchback Vale", difficulty: "Blue", length: "1.7 km", condition: "moguls", score: 43, confidence: 72, reports: 19, age: 9, path: "M444 131 C415 158 390 176 402 202 S369 235 380 265 S346 297 328 343", labelX: 327, labelY: 319 },
  { id: "cloudline", name: "Cloudline", difficulty: "Black", length: "1.2 km", condition: "icy", score: 93, confidence: 84, reports: 26, age: 6, path: "M425 123 C390 149 371 174 383 197 S348 229 358 255 S326 293 304 333", labelX: 289, labelY: 303 }
];
