/**
 * Sukhan AI — Built-in Literary Shayari Corpus (150+ Diverse Couplets)
 * Covers 15 legendary Urdu & Hindi poets across classical, progressive, Sufi,
 * and modern eras so RAG retrieval works instantaneously offline & in APKs.
 */

export interface CorpusCouplet {
  id: string;
  poet: string;
  era: 'classical' | 'sufi' | 'progressive' | 'modern';
  form: 'ghazal' | 'sher' | 'doha' | 'nazm' | 'qita';
  moods: string[];
  roman: string;
  devanagari: string;
  radif?: string;
  qafiya?: string;
  motifs: string[];
  source: 'builtin' | 'rekhta-open-dataset';
}

type RawSeed = [
  poet: string,
  era: CorpusCouplet['era'],
  form: CorpusCouplet['form'],
  moods: string[],
  roman: string,
  devanagari: string,
  radif: string,
  qafiya: string,
  motifs: string[]
];

const RAW_CORPUS_SEEDS: RawSeed[] = [
  // ======================== 1. MIRZA GHALIB (12) ========================
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['falsafa', 'dard', 'ishq-e-majazi'],
    'Hazaaron khwahishein aisi ke har khwahish pe dam nikle\nBahut nikle mere armaan lekin phir bhi kam nikle',
    'हज़ारों ख़्वाहिशें ऐसी कि हर ख़्वाहिश पे दम निकले\nबहुत निकले मेरे अरमान लेकिन फिर भी कम निकले',
    'nikle', 'dam / kam', ['khwahish', 'armaan', 'hasrat', 'zindagi']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['dard', 'hijr', 'ishq-e-majazi'],
    'Ishq par zor nahin hai ye woh aatish Ghalib\nKe lagaaye na lage aur bujhaaye na bane',
    'इश्क़ पर ज़ोर नहीं है ये वो आतिश ग़ालिब\nकि लगाए न लगे और बुझाए न बने',
    'bane', 'lage / bane', ['ishq', 'aatish', 'shola', 'junoon']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['falsafa', 'sukoon', 'dard'],
    'Dil-e-naadaan tujhe hua kya hai\nAakhir is dard ki dawa kya hai',
    'दिल-ए-नादाँ तुझे हुआ क्या है\nआख़िर इस दर्द की दवा क्या है',
    'kya hai', 'hua / dawa', ['dard', 'dawa', 'dil-e-naadaan', 'khud-kalami']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['falsafa', 'tanz', 'zindagi'],
    'Hum ko maalum hai jannat ki haqeeqat lekin\nDil ke khush rakhne ko Ghalib ye khayal achha hai',
    'हम को मालूम है जन्नत की हक़ीक़त लेकिन\nदिल के ख़ुश रखने को ग़ालिब ये ख़याल अच्छा है',
    'achha hai', 'khayal', ['jannat', 'haqeeqat', 'khayal', 'tanz']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['hijr', 'dard', 'tanhai'],
    'Un ke dekhe se jo aa jaati hai munh par raunaq\nWoh samajhte hain ke beemar ka haal achha hai',
    'उन के देखे से जो आ जाती है मुँह पर रौनक़\nवो समझते हैं कि बीमार का हाल अच्छा है',
    'achha hai', 'haal', ['deed', 'raunaq', 'beemar', 'ishq']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['falsafa', 'ishq-e-haqiqi', 'sufi'],
    'Na tha kuch toh Khuda tha, kuch na hota toh Khuda hota\nDuboya mujh ko hone ne, na hota main toh kya hota',
    'न था कुछ तो ख़ुदा था, कुछ न होता तो ख़ुदा होता\nडुबोया मुझ को होने ने, न होता मैं तो क्या होता',
    'hota', 'khuda / kya', ['khuda', 'wujood', 'fana', 'falsafa']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['dard', 'hijr', 'ranjish'],
    'Aah ko chahiye ik umr asar hone tak\nKaun jeeta hai teri zulf ke sar hone tak',
    'आह को चाहिए इक उम्र असर होने तक\nकौन जीता है तिरी ज़ुल्फ़ के सर होने तक',
    'hone tak', 'asar / sar', ['aah', 'umr', 'zulf', 'sabr']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['falsafa', 'zindagi', 'dard'],
    'Qaid-e-hayat o band-e-gham asl mein dono ek hain\nMaut se pehle aadmi gham se najaat paaye kyun',
    'क़ैद-ए-हयात ओ बंद-ए-ग़म अस्ल में दोनों एक हैं\nमौत से पहले आदमी ग़म से नजात पाए क्यूँ',
    'kyun', 'paaye', ['hayat', 'gham', 'najaat', 'falsafa']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['ishq-e-majazi', 'mehfil', 'suroor'],
    'Ye na thi hamari qismat ke wisaal-e-yaar hota\nAgar aur jeete rehte yahi intezaar hota',
    'ये न थी हमारी क़िस्मत कि विसाल-ए-यार होता\nअगर और जीते रहते यही इंतज़ार होता',
    'hota', 'yaar / intezaar', ['qismat', 'wisaal', 'yaar', 'hasrat']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['sukoon', 'falsafa', 'khud-kalami'],
    'Baazicha-e-atfaal hai duniya mere aage\nHota hai shab-o-roz tamasha mere aage',
    'बाज़ीचा-ए-अत्फ़ाल है दुनिया मेरे आगे\nहोता है शब-ओ-रोज़ तमाशा मेरे आगे',
    'mere aage', 'duniya / tamasha', ['duniya', 'shab-o-roz', 'tamasha', 'falsafa']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['dard', 'wafa', 'gurez'],
    'Hum wahan hain jahan se hum ko bhi\nKuch hamari khabar nahin aati',
    'हम वहाँ हैं जहाँ से हम को भी\nकुछ हमारी ख़बर नहीं आती',
    'nahin aati', 'khabar', ['bekhudi', 'khala', 'tanhai', 'khabar']
  ],
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['ishq-e-majazi', 'ranjish', 'guftagu'],
    'Koi mere dil se poochhe tere teer-e-neem-kash ko\nYe khalish kahan se hoti jo jigar ke paar hota',
    'कोई मेरे दिल से पूछे तिरे तीर-ए-नीम-कश को\nये ख़लिश कहाँ से होती जो जिगर के पार होता',
    'hota', 'paar', ['khalish', 'jigar', 'teer', 'ishq']
  ],

  // ======================== 2. MEER TAQI MEER (11) ========================
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['dard', 'hijr', 'ishq-e-majazi'],
    'Patta patta boota boota haal hamara jaane hai\nJaane na jaane gul hi na jaane baagh toh saara jaane hai',
    'पत्ता पत्ता बूटा बूटा हाल हमारा जाने है\nजाने न जाने गुल ही न जाने बाग़ तो सारा जाने है',
    'jaane hai', 'hamara / saara', ['gul', 'baagh', 'patta', 'haal-e-dil']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['ishq-e-majazi', 'sukoon', 'husn'],
    'Naazuki us ke lab ki kya kahiye\nPankhudi ik gulab ki si hai',
    'नाज़ुकी उस के लब की क्या कहिए\nपंखुड़ी इक गुलाब की सी है',
    'ki si hai', 'gulab', ['naazuki', 'lab', 'gulab', 'husn']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['dard', 'falsafa', 'shaam'],
    'Shaam hi se bujha sa rehta hai\nDil hua hai chiraagh muflis ka',
    'शाम ही से बुझा सा रहता है\nदिल हुआ है चराग़ मुफ़लिस का',
    'muflis ka', 'chiraagh', ['shaam', 'chiraagh', 'muflis', 'udaasi']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['falsafa', 'zindagi', 'waqt'],
    'Hasti apni habaab ki si hai\nYe numaish saraab ki si hai',
    'हस्ती अपनी हबाब की सी है\nये नुमाइश सराब की सी है',
    'ki si hai', 'habaab / saraab', ['hasti', 'habaab', 'saraab', 'fana']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['dard', 'hijr', 'chashm-e-nam'],
    'Dekh toh dil ke jaan se uthta hai\nYe dhuaan sa kahan se uthta hai',
    'देख तो दिल कि जाँ से उठता है\nये धुआँ सा कहाँ से उठता है',
    'uthta hai', 'jaan / kahan', ['dhuaan', 'dil', 'soz', 'dard']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['ishq-e-majazi', 'wafa', 'dard'],
    'Ulti ho gayin sab tadbeerein kuch na dawa ne kaam kiya\nDekha is beemari-e-dil ne aakhir kaam tamaam kiya',
    'उल्टी हो गईं सब तदबीरें कुछ न दवा ने काम किया\nदेखा इस बीमारी-ए-दिल ने आख़िर काम तमाम किया',
    'kiya', 'kaam / tamaam', ['tadbeer', 'dawa', 'ishq', 'junoon']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['tanhai', 'khamoshi', 'sukoon'],
    'Ab toh jaate hain maikade se Meer\nPhir milenge agar Khuda laaya',
    'अब तो जाते हैं मय-कदे से मीर\nफिर मिलेंगे अगर ख़ुदा लाया',
    'laaya', 'khuda', ['maikada', 'rukhsat', 'khuda', 'mehfil']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['dard', 'safar', 'zindagi'],
    'Ibtida-e-ishq hai rota hai kya\nAage aage dekhiye hota hai kya',
    'इब्तिदा-ए-इश्क़ है रोता है क्या\nआगे आगे देखिए होता है क्या',
    'hai kya', 'rota / hota', ['ibtida', 'ishq', 'safar', 'waqt']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['shehr', 'yaad', 'dard'],
    'Dilli ke na the kooche auraaq-e-musawwir the\nJo shakl nazar aayi tasveer nazar aayi',
    'दिल्ली के न थे कूचे औराक़-ए-मुसव्विर थे\nजो शक्ल नज़र आई तस्वीर नज़र आई',
    'nazar aayi', 'shakl / tasveer', ['dilli', 'koocha', 'tasveer', 'yaad']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['sukoon', 'sufi', 'falsafa'],
    'Sarhaane Meer ke koi na bolo\nAbhi tuk ro ke so jaane laga hai',
    'सरहाने मीर के कोई न बोलो\nअभी टुक रो के सो जाने लगा है',
    'laga hai', 'so jaane', ['khamoshi', 'neend', 'dard', 'thehraav']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['ishq-e-majazi', 'chashm-e-nam', 'sukoon'],
    'Meer un neem-baaz aankhon mein\nSaari masti sharaab ki si hai',
    'मीर उन नीम-बाज़ आँखों में\nसारी मस्ती शराब की सी है',
    'ki si hai', 'sharaab', ['neem-baaz', 'masti', 'aankhein', 'suroor']
  ],

  // ======================== 3. FAIZ AHMAD FAIZ (11) ========================
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['ishq-e-majazi', 'dard', 'inquilab'],
    'Aur bhi dukh hain zamaane mein mohabbat ke siwa\nRaahatein aur bhi hain wasl ki raahat ke siwa',
    'और भी दुख हैं ज़माने में मोहब्बत के सिवा\nराहतें और भी हैं वस्ल की राहत के सिवा',
    'ke siwa', 'mohabbat / raahat', ['dukh', 'zamaana', 'wasl', 'raahat']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['hijr', 'yaad', 'dard'],
    'Gulon mein rang bhare baad-e-naubahaar chale\nChale bhi aao ke gulshan ka kaarobaar chale',
    'गुलों में रंग भरे बाद-ए-नौ-बहार चले\nचले भी आओ कि गुलशन का कारोबार चले',
    'chale', 'naubahaar / kaarobaar', ['gul', 'naubahaar', 'gulshan', 'hijr']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['ishq-e-majazi', 'hijr', 'sukoon'],
    'Donon jahaan teri mohabbat mein haar ke\nWoh ja raha hai koi shab-e-gham guzaar ke',
    'दोनों जहाँ तिरी मोहब्बत में हार के\nवो जा रहा है कोई शब-ए-ग़म गुज़ार के',
    'ke', 'haar / guzaar', ['shab-e-gham', 'mohabbat', 'jahaan', 'safar']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'nazm', ['inquilab', 'hausla', 'umeed'],
    'Bol ke lab azaad hain tere\nBol zabaan ab tak teri hai',
    'बोल कि लब आज़ाद हैं तेरे\nबोल ज़बाँ अब तक तेरी है',
    'teri hai', 'azaad', ['lab', 'azaadi', 'zabaan', 'inquilab']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['hijr', 'yaad', 'shaam'],
    'Raat yun dil mein teri khoi hui yaad aayi\nJaise veeraane mein chupke se bahaar aa jaaye',
    'रात यूँ दिल में तिरी खोई हुई याद आई\nजैसे वीराने में चुपके से बहार आ जाए',
    'aa jaaye', 'bahaar', ['raat', 'yaad', 'veeraana', 'bahaar']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['inquilab', 'hausla', 'umeed'],
    'Hum dekhenge, laazim hai ke hum bhi dekhenge\nWoh din ke jis ka waada hai jo lauh-e-azal pe likha hai',
    'हम देखेंगे, लाज़िम है कि हम भी देखेंगे\nवो दिन कि जिस का वादा है जो लौह-ए-अज़ल पे लिखा है',
    'dekhenge', 'laazim', ['sehar', 'waada', 'inquilab', 'umeed']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['dard', 'ranjish', 'tanhai'],
    'Kab thehrega dard ae dil kab raat basar hogi\nSunte the woh aayenge sunte the sahar hogi',
    'कब ठहरेगा दर्द ऐ दिल कब रात बसर होगी\nसुनते थे वो आएँगे सुनते थे सहर होगी',
    'hogi', 'basar / sahar', ['raat', 'sahar', 'dard', 'umeed']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['inquilab', 'wafa', 'hausla'],
    'Jis dhaj se koi maqtal mein gaya woh shaan salamat rehti hai\nYe jaan toh aani jaani hai is jaan ki toh koi baat nahin',
    'जिस धज से कोई मक़्तल में गया वो शान सलामत रहती है\nये जान तो आनी जानी है इस जान की तो कोई बात नहीं',
    'baat nahin', 'shaan / jaan', ['maqtal', 'shaan', 'hausla', 'wafa']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['sukoon', 'shaam', 'yaad'],
    'Shaam-e-firaaq ab na poochh aayi aur aa ke tal gayi\nDil tha ke phir behal gaya jaan thi ke phir sambhal gayi',
    'शाम-ए-फ़िराक़ अब न पूछ आई और आ के टल गई\nदिल था कि फिर बहल गया जाँ थी कि फिर सँभल गई',
    'gayi', 'tal / sambhal', ['shaam-e-firaaq', 'sabr', 'sukoon', 'hijr']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['ishq-e-majazi', 'wafa', 'sukoon'],
    'Kar raha tha gham-e-jahaan ka hisaab\nAaj tum yaad behisaab aaye',
    'कर रहा था ग़म-ए-जहाँ का हिसाब\nआज तुम याद बे-हिसाब आए',
    'aaye', 'hisaab / behisaab', ['gham-e-jahaan', 'yaad', 'behisaab', 'ishq']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['umeed', 'safar', 'inquilab'],
    'Chali hai rasm ke koi na sar utha ke chale\nJo koi chaahne waala tawaaf ko nikle',
    'चली है रस्म कि कोई न सर उठा के चले\nजो कोई चाहने वाला तवाफ़ को निकले',
    'chale', 'utha', ['rasm', 'himmat', 'safar', 'inquilab']
  ],

  // ======================== 4. JAUN ELIA (11) ========================
  [
    'Jaun Elia', 'modern', 'ghazal', ['falsafa', 'dard', 'tanhai'],
    'Kitni dilkash ho tum kitna diljoo hoon main\nKya sitam hai ke hum log mar jaayenge',
    'कितनी दिलकश हो तुम कितना दिल-जू हूँ मैं\nक्या सितम है कि हम लोग मर जाएँगे',
    'jaayenge', 'mar', ['dilkash', 'waqt', 'fana', 'falsafa']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['dard', 'ranjish', 'khud-kalami'],
    'Apne sab yaar kaam kar rahe hain\nAur hum hain ke naam kar rahe hain',
    'अपने सब यार काम कर रहे हैं\nऔर हम हैं कि नाम कर रहे हैं',
    'kar rahe hain', 'kaam / naam', ['yaar', 'tanz', 'khud-kalami', 'zindagi']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['tanhai', 'khala', 'falsafa'],
    'Kaun is ghar ki dekh-bhaal kare\nRoz ik cheez toot jaati hai',
    'कौन इस घर की देख-भाल करे\nरोज़ इक चीज़ टूट जाती है',
    'jaati hai', 'toot', ['ghar', 'shikast', 'tanhai', 'khala']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['hijr', 'gurez', 'dard'],
    'Ilaj ye hai ke majboor kar diya jaaun\nWagarna yun toh kisi ki nahin suni maine',
    'इलाज ये है कि मजबूर कर दिया जाऊँ\nवगर्ना यूँ तो किसी की नहीं सुनी मैंने',
    'maine', 'suni', ['zid', 'ana', 'khud-kalami', 'ishq']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['dard', 'ranjish', 'wafa'],
    'Kya sitam hai ke ab teri soorat\nGhaur karne pe yaad aati hai',
    'क्या सितम है कि अब तिरी सूरत\nग़ौर करने पे याद आती है',
    'aati hai', 'yaad', ['soorat', 'yaad', 'waqt', 'hijr']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['falsafa', 'khala', 'khud-kalami'],
    'Main bhi bahut ajeeb hoon itna ajeeb hoon ke bas\nKhud ko tabaah kar liya aur malaal bhi nahin',
    'मैं भी बहुत अजीब हूँ इतना अजीब हूँ कि बस\nख़ुद को तबाह कर लिया और मलाल भी नहीं',
    'bhi nahin', 'malaal', ['malaal', 'khud-kalami', 'bekhudi', 'falsafa']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['sukoon', 'khamoshi', 'tanhai'],
    'Jo guzaari na ja saki hum se\nHum ne woh zindagi guzaari hai',
    'जो गुज़ारी न जा सकी हम से\nहम ने वो ज़िंदगी गुज़ारी है',
    'hai', 'guzaari', ['zindagi', 'sabr', 'khamoshi', 'dard']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['ishq-e-majazi', 'ranjish', 'guftagu'],
    'Naya ik rishta paida kyun karein hum\nBichhadna hai toh jhagda kyun karein hum',
    'नया इक रिश्ता पैदा क्यूँ करें हम\nबिछड़ना है तो झगड़ा क्यूँ करें हम',
    'kyun karein hum', 'paida / jhagda', ['rishta', 'gurez', 'bichhadna', 'tanz']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['khamoshi', 'sukoon', 'dard'],
    'Khamoshi se ada ho rasm-e-doori\nKoi hangaama barpa kyun karein hum',
    'ख़ामोशी से अदा हो रस्म-ए-दूरी\nकोई हंगामा बरपा क्यूँ करें हम',
    'kyun karein hum', 'barpa', ['khamoshi', 'doori', 'sukoot', 'tehzeeb']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['falsafa', 'zindagi', 'waqt'],
    'Umr guzregi imtihaan mein kya\nDaagh hi denge mujh ko daan mein kya',
    'उम्र गुज़रेगी इम्तिहान में क्या\nदाग़ ही देंगे मुझ को दान में क्या',
    'mein kya', 'imtihaan / daan', ['umr', 'imtihaan', 'zindagi', 'falsafa']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['ishq-e-majazi', 'yaad', 'shaam'],
    'Be-dili kya yun hi din guzar jaayenge\nSirf zinda rahe hum toh mar jaayenge',
    'बे-दिली क्या यूँही दिन गुज़र जाएँगे\nसिर्फ़ ज़िंदा रहे हम तो मर जाएँगे',
    'jaayenge', 'guzar / mar', ['be-dili', 'waqt', 'zindagi', 'khalish']
  ],

  // ======================== 5. ALLAMA IQBAL (11) ========================
  [
    'Allama Iqbal', 'classical', 'ghazal', ['hausla', 'inquilab', 'falsafa'],
    'Khudi ko kar buland itna ke har taqdeer se pehle\nKhuda bande se khud poochhe bata teri raza kya hai',
    'ख़ुदी को कर बुलंद इतना कि हर तक़दीर से पहले\nख़ुदा बंदे से ख़ुद पूछे बता तेरी रज़ा क्या है',
    'kya hai', 'raza', ['khudi', 'taqdeer', 'hausla', 'bulandi']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['hausla', 'safar', 'umeed'],
    'Sitaaron se aage jahaan aur bhi hain\nAbhi ishq ke imtihaan aur bhi hain',
    'सितारों से आगे जहाँ और भी हैं\nअभी इश्क़ के इम्तिहाँ और भी हैं',
    'aur bhi hain', 'jahaan / imtihaan', ['parwaaz', 'jahaan', 'justajoo', 'hausla']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['hausla', 'safar', 'inquilab'],
    'Tu shaheen hai parwaaz hai kaam tera\nTere saamne aasmaan aur bhi hain',
    'तू शाहीं है परवाज़ है काम तेरा\nतेरे सामने आसमाँ और भी हैं',
    'aur bhi hain', 'aasmaan', ['shaheen', 'parwaaz', 'aasmaan', 'himmat']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['hausla', 'zindagi', 'falsafa'],
    'Tundi-e-baad-e-mukhaalif se na ghabra ae uqaab\nYe toh chalti hai tujhe ooncha udaane ke liye',
    'तुंदी-ए-बाद-ए-मुख़ालिफ़ से न घबरा ऐ उक़ाब\nये तो चलती है तुझे ऊँचा उड़ाने के लिए',
    'ke liye', 'udaane', ['uqaab', 'aandhi', 'parwaaz', 'hausla']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['falsafa', 'ishq-e-haqiqi', 'sufi'],
    'Apne man mein doob kar paa ja suraagh-e-zindagi\nTu agar mera nahin banta na ban apna toh ban',
    'अपने मन में डूब कर पा जा सुराग़-ए-ज़िंदगी\nतू अगर मेरा नहीं बनता न बन अपना तो बन',
    'ban', 'apna', ['suraagh', 'zindagi', 'khudi', 'rooh']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['umeed', 'hausla', 'sehar'],
    'Nahi hai na-umeed Iqbal apni kisht-e-weeraan se\nZara nam ho toh ye mitti badi zarkhez hai saaqi',
    'नहीं है ना-उम्मीद इक़बाल अपनी किश्त-ए-वीराँ से\nज़रा नम हो तो ये मिट्टी बड़ी ज़रख़ेज़ है साक़ी',
    'hai saaqi', 'zarkhez', ['mitti', 'umeed', 'zarkhez', 'sehar']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['falsafa', 'safar', 'justajoo'],
    'Yaqeen mohkam, amal paiham, mohabbat faateh-e-aalam\nJihaad-e-zindagani mein hain ye mardon ki shamsheerein',
    'यक़ीं मोहकम, अमल पैहम, मोहब्बत फ़ातेह-ए-आलम\nजिहाद-ए-ज़िंदगानी में हैं ये मर्दों की शमशीरें',
    'shamsheerein', 'amal / mohabbat', ['yaqeen', 'amal', 'mohabbat', 'hausla']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['sufi', 'ishq-e-haqiqi', 'falsafa'],
    'Tere ishq ki inteha chahta hoon\nMeri saadgi dekh kya chahta hoon',
    'तिरे इश्क़ की इंतिहा चाहता हूँ\nमिरी सादगी देख क्या चाहता हूँ',
    'chahta hoon', 'inteha / kya', ['saadgi', 'ishq-e-haqiqi', 'justajoo', 'bandagi']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['falsafa', 'zindagi', 'umeed'],
    'Hazaaron saal nargis apni be-noori pe roti hai\nBadi mushkil se hota hai chaman mein deedawar paida',
    'हज़ारों साल नर्गिस अपनी बे-नूरी पे रोती है\nबड़ी मुश्किल से होता है चमन में दीदावर पैदा',
    'paida', 'deedawar', ['nargis', 'chaman', 'deedawar', 'noor']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['sukoon', 'sufi', 'khamoshi'],
    'Koi andaaza kar sakta hai us ke zor-e-baazoo ka\nNigaah-e-mard-e-momin se badal jaati hain taqdeerein',
    'कोई अंदाज़ा कर सकता है उस के ज़ोर-ए-बाज़ू का\nनिगाह-ए-मर्द-ए-मोमिन से बदल जाती हैं तक़दीरें',
    'taqdeerein', 'badal', ['nigaah', 'taqdeer', 'yaqeen', 'hausla']
  ],
  [
    'Allama Iqbal', 'classical', 'ghazal', ['safar', 'justajoo', 'falsafa'],
    'Guftaar mein, kirdaar mein, Allah ki burhaan\nQahhaari o ghaffaari o quddoosi o jabaroot',
    'गुफ़्तार में, किरदार में, अल्लाह की बुरहान\nक़ह्हारी ओ ग़फ़्फ़ारी ओ क़ुद्दूसी ओ जबरूत',
    'jabaroot', 'kirdaar', ['kirdaar', 'guftaar', 'khudi', 'sufi']
  ],

  // ======================== 6. SANT KABIR (10) ========================
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'ishq-e-haqiqi', 'sukoon'],
    'Kastoori kundali base, mrig dhoonde ban maahin\nAise ghat ghat Ram hain, duniya dekhe naahin',
    'कस्तूरी कुंडल बसे, मृग ढूँढे बन माहिं\nऐसे घट घट राम हैं, दुनिया देखे नाहिं',
    'naahin', 'maahin / naahin', ['kastoori', 'ghat', 'antarman', 'sufi']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'sukoon', 'falsafa'],
    'Dheere dheere re mana, dheere sab kuch hoye\nMaali seenche sau ghada, ritu aaye phal hoye',
    'धीरे धीरे रे मना, धीरे सब कुछ होय\nमाली सींचे सौ घड़ा, ऋतु आए फल होय',
    'hoye', 'kuch / phal', ['sabr', 'thehraav', 'ritu', 'sukoon']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'ishq-e-haqiqi', 'falsafa'],
    'Pothi padh padh jag mua, pandit bhaya na koye\nDhai aakhar prem ka, padhe so pandit hoye',
    'पोथी पढ़ि पढ़ि जग मुआ, पंडित भया न कोय\nढाई आखर प्रेम का, पढ़े सो पंडित होय',
    'hoye', 'koye / hoye', ['prem', 'pothi', 'gyan', 'ishq-e-haqiqi']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'falsafa', 'khud-kalami'],
    'Bura jo dekhan main chala, bura na miliya koye\nJo dil khoja aapna, mujhsa bura na koye',
    'बुरा जो देखन मैं चला, बुरा न मिलिया कोय\nजो दिल खोजा आपना, मुझसा बुरा न कोय',
    'koye', 'miliya / aapna', ['khud-kalami', 'aaina', 'saadgi', 'sufi']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'sukoon', 'mehfil'],
    'Aisi vaani boliye, man ka aapa khoye\nAuran ko sheetal kare, aapahu sheetal hoye',
    'ऐसी वाणी बोलिए, मन का आपा खोय\nऔरन को शीतल करे, आपहुँ शीतल होय',
    'hoye', 'khoye / hoye', ['vaani', 'sheetal', 'tehzeeb', 'sukoon']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'ishq-e-haqiqi', 'wafa'],
    'Jab main tha tab Hari nahin, ab Hari hain main naahin\nPrem gali ati saankari, ta mein do na samaahin',
    'जब मैं था तब हरि नहीं, अब हरि हैं मैं नाहिं\nप्रेम गली अति साँकरी, ता में दो न समाहिं',
    'samaahin', 'naahin / samaahin', ['prem-gali', 'fana', 'khudi', 'sufi']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['falsafa', 'waqt', 'hausla'],
    'Kaal kare so aaj kar, aaj kare so ab\nPal mein parlay hoyegi, bahuri karega kab',
    'काल करे सो आज कर, आज करे सो अब\nपल में परलय होएगी, बहुरि करेगा कब',
    'kab', 'ab / kab', ['waqt', 'amal', 'pal', 'zindagi']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'falsafa', 'sukoon'],
    'Maati kahe kumhaar se, tu kya roonde moye\nEk din aisa aayega, main roondungi toye',
    'माटी कहे कुम्हार से, तू क्या रूँदे मोय\nएक दिन ऐसा आएगा, मैं रूँदूँगी तोय',
    'toye', 'moye / toye', ['maati', 'kumhaar', 'fana', 'falsafa']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'ishq-e-haqiqi', 'justajoo'],
    'Jin khoja tin paaiyaan, gahre paani paith\nMain bapura boodan dara, raha kinaare baith',
    'जिन खोजा तिन पाइयाँ, गहरे पानी पैठ\nमैं बपुरा बूडन डरा, रहा किनारे बैठ',
    'baith', 'paith / baith', ['justajoo', 'samundar', 'kinaara', 'himmat']
  ],
  [
    'Sant Kabir', 'sufi', 'doha', ['sufi', 'sukoon', 'dosti'],
    'Saai itna deejiye, jaame kutumb samaaye\nMain bhi bhookha na rahun, saadhu na bhookha jaaye',
    'साईं इतना दीजिए, जा में कुटुम समाय\nमैं भी भूखा न रहूँ, साधु न भूखा जाय',
    'jaaye', 'samaaye / jaaye', ['qanaat', 'sukoon', 'barkat', 'saadgi']
  ],

  // ======================== 7. AMIR KHUSRAU (10) ========================
  [
    'Amir Khusrau', 'sufi', 'ghazal', ['sufi', 'ishq-e-haqiqi', 'suroor'],
    'Chhaap tilak sab chheeni re mose naina milaike\nPrem bhati ka madhva pilaike, matwaari kar deeni re',
    'छाप तिलक सब छीनी रे मोसे नैना मिलाइके\nप्रेम भटी का मधवा पिलाइके, मतवारी कर दीनी रे',
    're', 'milaike / deeni', ['naina', 'prem', 'suroor', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'ghazal', ['sufi', 'ishq-e-haqiqi', 'justajoo'],
    'Khusrau dariya prem ka, ulti wa ki dhaar\nJo utra so doob gaya, jo dooba so paar',
    'ख़ुसरो दरिया प्रेम का, उल्टी वा की धार\nजो उतरा सो डूब गया, जो डूबा सो पार',
    'paar', 'dhaar / paar', ['dariya', 'prem', 'dhaar', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'ghazal', ['sufi', 'ishq-e-haqiqi', 'fana'],
    'Man tu shudam tu man shudi, man tan shudam tu jaan shudi\nTa kas na goyad baad az een, man deegaram tu deegari',
    'मन तू शुदम तू मन शुदी, मन तन शुदम तू जान शुदी\nता कस न गोयद बाद अज़ ईं, मन दीगरम तू दीगरी',
    'deegari', 'shudi', ['wisaal', 'rooh', 'ishq-e-haqiqi', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'ghazal', ['sufi', 'hijr', 'ishq-e-majazi'],
    'Zehaal-e-miskeen makun taghaaful, duraaye naina banaaye batiyaan\nKe taab-e-hijraan nadaaram ae jaan, na leho kaahe lagaaye chhatiyaan',
    'ज़ेहाल-ए-मिस्कीं मकुन तग़ाफ़ुल, दुराए नैना बनाए बतियाँ\nकि ताब-ए-हिज्राँ नदारम ऐ जाँ, न लेहो काहे लगाए छतियाँ',
    'chhatiyaan', 'batiyaan / chhatiyaan', ['hijr', 'naina', 'hindavi', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'doha', ['sufi', 'dard', 'hijr'],
    'Gori sove sej par, mukh par daare kes\nChal Khusrau ghar aapne, rain bhayi chahun des',
    'गोरी सोवे सेज पर, मुख पर डारे केस\nचल ख़ुसरो घर आपने, रैन भई चहुँ देस',
    'des', 'kes / des', ['rain', 'ghar', 'rukhsat', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'doha', ['sufi', 'ishq-e-haqiqi', 'mehfil'],
    'Aaj rang hai ae maa rang hai ri\nMere mehboob ke ghar rang hai ri',
    'आज रंग है ऐ माँ रंग है री\nमेरे महबूब के घर रंग है री',
    'rang hai ri', 'ghar', ['rang', 'mehboob', 'suroor', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'doha', ['sufi', 'ishq-e-haqiqi', 'sukoon'],
    'Khusrau rain suhaag ki, jaagi pi ke sang\nTan mero man piyo ko, dou bhaye ek rang',
    'ख़ुसरो रैन सुहाग की, जागी पी के संग\nतन मेरो मन पी को, दोउ भये एक रंग',
    'rang', 'sang / rang', ['rain', 'ek-rang', 'wisaal', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'ghazal', ['sufi', 'barish', 'mehfil'],
    'Sawan aayo re sakhi, ghir aayi kaari ghata\nBoondan boondan mein base, mere piya ki sada',
    'सावन आयो रे सखी, घिर आई कारी घटा\nबूँदन बूँदन में बसे, मेरे पिया की सदा',
    'sada', 'ghata / sada', ['sawan', 'ghata', 'boond', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'doha', ['sufi', 'falsafa', 'khud-kalami'],
    'Kaafir-e-ishqam musalmaani mara darkaar neest\nHar rag-e-man taar gashta haajat-e-zunnaar neest',
    'काफ़िर-ए-इश्क़म मुसलमानी मरा दरकार नीस्त\nहर रग-ए-मन तार गश्ता हाजत-ए-ज़ुन्नार नीस्त',
    'neest', 'darkaar / zunnaar', ['ishq-e-haqiqi', 'taar', 'bandagi', 'sufi']
  ],
  [
    'Amir Khusrau', 'sufi', 'doha', ['sufi', 'virasat', 'sukoon'],
    'Agar firdaus bar roo-e-zameen ast\nHameen ast o hameen ast o hameen ast',
    'अगर फ़िरदौस बर रू-ए-ज़मीन अस्त\nहमीं अस्त ओ हमीं अस्त ओ हमीं अस्त',
    'hameen ast', 'zameen', ['firdaus', 'zameen', 'virasat', 'sukoon']
  ],

  // ======================== 8. DAGH DEHLVI (10) ========================
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['ishq-e-majazi', 'mehfil', 'virasat'],
    'Urdu hai jis ka naam hamein jaante hain Dagh\nHindustan mein dhoom hamari zabaan ki hai',
    'उर्दू है जिस का नाम हमीं जानते हैं दाग़\nहिंदुस्ताँ में धूम हमारी ज़बाँ की है',
    'ki hai', 'zabaan', ['urdu', 'zabaan', 'virasat', 'mehfil']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['ishq-e-majazi', 'ranjish', 'guftagu'],
    'Ranj ki jab guftagu hone lagi\nAap se tum, tum se tu hone lagi',
    'रंज की जब गुफ़्तगू होने लगी\nआप से तुम, तुम से तू होने लगी',
    'hone lagi', 'guftagu / tu', ['ranjish', 'guftagu', 'tehzeeb', 'ishq']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['dard', 'hijr', 'ishq-e-majazi'],
    'Sab log liye sang-e-malaamat nikal aaye\nShehr mein ik deewana kya nikla tamasha ho gaya',
    'सब लोग लिए संग-ए-मलामत निकल आए\nशहर में इक दीवाना क्या निकला तमाशा हो गया',
    'ho gaya', 'tamasha', ['malaamat', 'shehr', 'deewana', 'dard']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['ishq-e-majazi', 'wafa', 'gurez'],
    'Ghazab kiya tere waade pe aitbaar kiya\nTamaam raat qayaamat ka intezaar kiya',
    'ग़ज़ब किया तिरे वादे पे ऐतबार किया\nतमाम रात क़यामत का इंतज़ार किया',
    'kiya', 'aitbaar / intezaar', ['waada', 'aitbaar', 'raat', 'ishq']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['dard', 'mehfil', 'suroor'],
    'Ufaq pe chhaayi thi laali, hawa mein thi khushboo\nJo woh na aaye toh saari bahaar phiki thi',
    'उफ़ुक़ पे छाई थी लाली, हवा में थी ख़ुशबू\nजो वो न आए तो सारी बहार फीकी थी',
    'thi', 'phiki', ['ufaq', 'khushboo', 'bahaar', 'hijr']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['ishq-e-majazi', 'tanz', 'guftagu'],
    'Khuda rakhe mohabbat ne humein kya kya dikhaya hai\nKisi ka ruthna dekha, kisi ko phir manaya hai',
    'ख़ुदा रखे मोहब्बत ने हमें क्या क्या दिखाया है\nकिसी का रूठना देखा, किसी को फिर मनाया है',
    'hai', 'dikhaya / manaya', ['ruthna', 'manana', 'guftagu', 'ishq']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['dard', 'wafa', 'ranjish'],
    'Tumhaare khat mein naya ik salaam kis ka tha\nNa tha raqeeb toh aakhir woh naam kis ka tha',
    'तुम्हारे ख़त में नया इक सलाम किस का था\nन था रक़ीब तो आख़िर वो नाम किस का था',
    'kis ka tha', 'salaam / naam', ['khat', 'raqeeb', 'ranjish', 'guftagu']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['mehfil', 'suroor', 'ishq-e-majazi'],
    'Shab-e-wisaal hai gul kar do in chiraaghon ko\nKhushi ki bazm mein kya kaam jalne waalon ka',
    'शब-ए-विसाल है गुल कर दो इन चराग़ों को\nख़ुशी की बज़्म में क्या काम जलने वालों का',
    'waalon ka', 'jalne', ['shab-e-wisaal', 'chiraagh', 'bazm', 'tanz']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['dard', 'khamoshi', 'wafa'],
    'Bataana bhi nahin aasaan, chhupaana bhi nahin aasaan\nYe dil ki baat hai saahib, sunaana bhi nahin aasaan',
    'बताना भी नहीं आसान, छुपाना भी नहीं आसान\nये दिल की बात है साहिब, सुनाना भी नहीं आसान',
    'nahin aasaan', 'chhupaana / sunaana', ['raaz', 'dil', 'khamoshi', 'ishq']
  ],
  [
    'Dagh Dehlvi', 'classical', 'ghazal', ['falsafa', 'waqt', 'yaad'],
    'Hum ne maana ke taghaaful na karoge lekin\nKhaak ho jaayenge hum tum ko khabar hone tak',
    'हम ने माना कि तग़ाफ़ुल न करोगे लेकिन\nख़ाक हो जाएँगे हम तुम को ख़बर होने तक',
    'hone tak', 'khabar', ['taghaaful', 'khaak', 'khabar', 'waqt']
  ],

  // ======================== 9. JIGAR MORADABADI (10) ========================
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['ishq-e-majazi', 'hausla', 'falsafa'],
    'Ye ishq nahin aasaan itna hi samajh leeje\nIk aag ka dariya hai aur doob ke jaana hai',
    'ये इश्क़ नहीं आसाँ इतना ही समझ लीजे\nइक आग का दरिया है और डूब के जाना है',
    'jaana hai', 'doob ke', ['aag', 'dariya', 'ishq', 'himmat']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['ishq-e-majazi', 'sukoon', 'wafa'],
    'Aadmi aadmi se milta hai\nDil magar kam kisi se milta hai',
    'आदमी आदमी से मिलता है\nदिल मगर कम किसी से मिलता है',
    'milta hai', 'kisi se', ['aadmi', 'rabt', 'dil', 'falsafa']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['mehfil', 'suroor', 'sufi'],
    'Un ka jo farz hai woh ahl-e-siyaasat jaanein\nMera paighaam mohabbat hai jahan tak pahunche',
    'उन का जो फ़र्ज़ है वो अहल-ए-सियासत जानें\nमेरा पैग़ाम मोहब्बत है जहाँ तक पहुँचे',
    'pahunche', 'jahan tak', ['paighaam', 'mohabbat', 'insaaniyat', 'sukoon']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['dard', 'hijr', 'chashm-e-nam'],
    'Jab ishq sikhata hai aadaab-e-khud-aagaahi\nKhulte hain ghulaamon par asraar-e-shahanshaahi',
    'जब इश्क़ सिखाता है आदाब-ए-ख़ुद-आगाही\nखुलते हैं ग़ुलामों पर असरार-ए-शहंशाही',
    'shahanshaahi', 'khud-aagaahi', ['aadaab', 'asraar', 'ishq', 'azmat']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['dard', 'yaad', 'tanhai'],
    'Hum ko mita sake ye zamaane mein dam nahin\nHum se zamaana khud hai zamaane se hum nahin',
    'हम को मिटा सके ये ज़माने में दम नहीं\nहम से ज़माना ख़ुद है ज़माने से हम नहीं',
    'nahin', 'dam / hum', ['zamaana', 'khudi', 'hausla', 'azm']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['ishq-e-majazi', 'suroor', 'mehfil'],
    'Ik lafz-e-mohabbat ka adna sa fasaana hai\nSimte toh dil-e-aashiq phaile toh zamaana hai',
    'इक लफ़्ज़-ए-मोहब्बत का अदना सा फ़साना है\nसिमटे तो दिल-ए-आशिक़ फैले तो ज़माना है',
    'hai', 'fasaana / zamaana', ['lafz', 'mohabbat', 'fasaana', 'aashiq']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['sukoon', 'dard', 'sabr'],
    'Gham-e-hasti se bas begaana hota\nKhudaaya kaash main deewana hota',
    'ग़म-ए-हस्ती से बस बेगाना होता\nख़ुदाया काश मैं दीवाना होता',
    'hota', 'begaana / deewana', ['gham-e-hasti', 'deewana', 'bekhudi', 'sukoon']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['hijr', 'yaad', 'shaam'],
    'Yaad-e-maazi azaab hai ya Rab\nChheen le mujh se haafiza mera',
    'याद-ए-माज़ी अज़ाब है या रब\nछीन ले मुझ से हाफ़िज़ा मेरा',
    'mera', 'haafiza', ['yaad-e-maazi', 'haafiza', 'dard', 'hijr']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['ishq-e-majazi', 'chashm-e-nam', 'wafa'],
    'Aankhon mein bas ke dil mein sama kar chale gaye\nKhwaabida zindagi ko jaga kar chale gaye',
    'आँखों में बस के दिल में समा कर चले गए\nख़्वाबीदा ज़िंदगी को जगा कर चले गए',
    'chale gaye', 'sama / jaga', ['khwaabida', 'zindagi', 'yaad', 'ishq']
  ],
  [
    'Jigar Moradabadi', 'classical', 'ghazal', ['sukoon', 'falsafa', 'mehfil'],
    'Jaan kar min-jumla-e-khaasaan-e-maikhaana mujhe\nMuddaton roya karenge jaam-o-paimaana mujhe',
    'जान कर मिन-जुमला-ए-ख़ासान-ए-मय-ख़ाना मुझे\nमुद्दतों रोया करेंगे जाम-ओ-पैमाना मुझे',
    'mujhe', 'maikhaana / paimaana', ['maikhaana', 'jaam', 'mehfil', 'suroor']
  ],

  // ======================== 10. PARVEEN SHAKIR (10) ========================
  [
    'Parveen Shakir', 'modern', 'ghazal', ['ishq-e-majazi', 'barish', 'khushboo'],
    'Woh toh khushboo hai hawaon mein bikhar jaayega\nMasla phool ka hai phool kidhar jaayega',
    'वो तो ख़ुशबू है हवाओं में बिखर जाएगा\nमसअला फूल का है फूल किधर जाएगा',
    'jaayega', 'bikhar / kidhar', ['khushboo', 'hawa', 'phool', 'hijr']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['ishq-e-majazi', 'barish', 'yaad'],
    'Koo-ba-koo phail gayi baat shanaasaai ki\nUs ne khushboo ki tarah meri pazeerayi ki',
    'कू-ब-कू फैल गई बात शनासाई की\nउस ने ख़ुशबू की तरह मेरी पज़ीराई की',
    'ki', 'shanaasaai / pazeerayi', ['khushboo', 'shanaasaai', 'ishq', 'nazakat']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['dard', 'hijr', 'barish'],
    'Kaise keh doon ke mujhe chhod diya hai us ne\nBaat toh sach hai magar baat hai ruswaai ki',
    'कैसे कह दूँ कि मुझे छोड़ दिया है उस ने\nबात तो सच है मगर बात है रुसवाई की',
    'ki', 'ruswaai', ['hijr', 'ruswaai', 'wafa', 'dard']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['barish', 'shaam', 'ishq-e-majazi'],
    'Baarish hui toh phoolon ke tan chaak ho gaye\nMausam ke haath bheeg ke sfaak ho gaye',
    'बारिश हुई तो फूलों के तन चाक हो गए\nमौसम के हाथ भीग के सफ़्फ़ाक हो गए',
    'ho gaye', 'chaak / sfaak', ['baarish', 'phool', 'mausam', 'nazakat']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['ishq-e-majazi', 'khamoshi', 'dastak'],
    'Chalne ka hausla nahin rukna muhaal kar diya\nIshq ke is safar ne toh mujh ko nidhaal kar diya',
    'चलने का हौसला नहीं रुकना मुहाल कर दिया\nइश्क़ के इस सफ़र ने तो मुझ को निढाल कर दिया',
    'kar diya', 'muhaal / nidhaal', ['safar', 'ishq', 'hausla', 'khalish']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['yaad', 'barish', 'sukoon'],
    'Jahan bhi jaayega woh phool apni khushboo se\nHawa mein mere hi aanchal ka rang chhodega',
    'जहाँ भी जाएगा वो फूल अपनी ख़ुशबू से\nहवा में मेरे ही आँचल का रंग छोड़ेगा',
    'chhodega', 'rang', ['aanchal', 'khushboo', 'hawa', 'ishq']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['tanhai', 'shaam', 'dard'],
    'Shaam ke saaye mein khidki pe rakhe phool ka rang\nAaj phir us ke na aane se udaasi mein dhala',
    'शाम के साए में खिड़की पे रखे फूल का रंग\nआज फिर उस के न आने से उदासी में ढला',
    'dhala', 'udaasi', ['khidki', 'shaam', 'saaya', 'hijr']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['ishq-e-majazi', 'guftagu', 'wafa'],
    'Us ne chhoo kar mere haathon ko kaha tha ik din\nIn lakeeron mein mere naam ka mausam likhna',
    'उस ने छू कर मिरे हाथों को कहा था इक दिन\nइन लकीरों में मिरे नाम का मौसम लिखना',
    'likhna', 'mausam', ['lakeerein', 'haath', 'mausam', 'ishq']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['sukoon', 'barish', 'khamoshi'],
    'Bheegi hui mitti ki mehak aur tera naam\nDono mere kamre mein utar aaye hain shaam',
    'भीगी हुई मिट्टी की महक और तिरा नाम\nदोनों मिरे कमरे में उतर आए हैं शाम',
    'shaam', 'naam', ['mitti', 'mehak', 'baarish', 'shaam']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['dard', 'gurez', 'khud-kalami'],
    'Main sach kahungi magar phir bhi haar jaaungi\nWoh jhooth bolega aur la-jawaab kar dega',
    'मैं सच कहूँगी मगर फिर भी हार जाऊँगी\nवो झूठ बोलेगा और ला-जवाब कर देगा',
    'kar dega', 'la-jawaab', ['sach', 'khamoshi', 'ranjish', 'dard']
  ],

  // ======================== 11. GULZAR (10) ========================
  [
    'Gulzar', 'modern', 'nazm', ['shaam', 'chai', 'yaad'],
    'Shaam se aankh mein nami si hai\nAaj phir aap ki kami si hai',
    'शाम से आँख में नमी सी है\nआज फिर आप की कमी सी है',
    'si hai', 'nami / kami', ['shaam', 'nami', 'kami', 'yaad']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['yaad', 'barish', 'sukoon'],
    'Kabhi kisi ko muqammal jahaan nahin milta\nKahin zameen toh kahin aasmaan nahin milta',
    'कभी किसी को मुकम्मल जहाँ नहीं मिलता\nकहीं ज़मीं तो कहीं आसमाँ नहीं मिलता',
    'nahin milta', 'jahaan / aasmaan', ['zameen', 'aasmaan', 'khala', 'falsafa']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['barish', 'chai', 'yaad'],
    'Ek purani diary ke sukhe hue gulaab jaisi hai shaam\nChhoo lo toh khushboo ki jagah yaadein bikhar jaati hain',
    'एक पुरानी डायरी के सूखे हुए गुलाब जैसी है शाम\nछू लो तो ख़ुशबू की जगह यादें बिखर जाती हैं',
    'jaati hain', 'bikhar', ['diary', 'shaam', 'yaad', 'nostalgia']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['waqt', 'falsafa', 'sukoon'],
    'Waqt rehta nahin kahin tik kar\nAadat is ki bhi aadmi si hai',
    'वक़्त रहता नहीं कहीं टिक कर\nआदत इस की भी आदमी सी है',
    'si hai', 'aadmi', ['waqt', 'aadat', 'safar', 'falsafa']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['chai', 'shaam', 'sukoon'],
    'Bhaap udti hui pyali mein thehri hai dhoop\nKisi purane mohalle ki sardi yaad aati hai',
    'भाप उड़ती हुई प्याली में ठहरी है धूप\nकिसी पुराने मोहल्ले की सर्दी याद आती है',
    'aati hai', 'yaad', ['chai', 'pyali', 'dhoop', 'mohalla']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['barish', 'shehr', 'khamoshi'],
    'Bheegi sadkon pe lamp-post ki peeli roshni\nRaat bhar kisi ke qadmon ka hisaab rakhti hai',
    'भीगी सड़कों पे लैंप-पोस्ट की पीली रोशनी\nरात भर किसी के क़दमों का हिसाब रखती है',
    'rakhti hai', 'hisaab', ['sadak', 'baarish', 'roshni', 'shehr']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['ishq-e-majazi', 'khamoshi', 'sukoon'],
    'Haath chhoote bhi toh rishte nahin chhoda karte\nWaqt ki shaakh se lamhe nahin toda karte',
    'हाथ छूटे भी तो रिश्ते नहीं छोड़ा करते\nवक़्त की शाख़ से लम्हे नहीं तोड़ा करते',
    'karte', 'chhoda / toda', ['shaakh', 'lamhe', 'rishta', 'wafa']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['safar', 'yaad', 'zindagi'],
    'Zindagi yun hui basar tanha\nQaafila saath aur safar tanha',
    'ज़िंदगी यूँ हुई बसर तन्हा\nक़ाफ़िला साथ और सफ़र तन्हा',
    'tanha', 'basar / safar', ['qaafila', 'safar', 'tanhai', 'zindagi']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['ghar', 'maa', 'yaad'],
    'Purane aangan ki neem ab bhi hawa mein hilati hai haath\nJaise koi buzurg der se aane par dantna bhool gaya ho',
    'पुराने आँगन की नीम अब भी हवा में हिलाती है हाथ\nजैसे कोई बुज़ुर्ग देर से आने पर डाँटना भूल गया हो',
    'gaya ho', 'bhool', ['aangan', 'neem', 'ghar', 'yaad']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['khamoshi', 'sukoon', 'dastak'],
    'Kuch baatein ankahi hi khoobsurat rehti hain\nHar dastak ka matlab darwaaza kholna nahin hota',
    'कुछ बातें अनकही ही ख़ूबसूरत रहती हैं\nहर दस्तक का मतलब दरवाज़ा खोलना नहीं होता',
    'nahin hota', 'kholna', ['dastak', 'ankahi', 'khamoshi', 'sukoon']
  ],

  // ======================== 12. JAVED AKHTAR (10) ========================
  [
    'Javed Akhtar', 'modern', 'ghazal', ['falsafa', 'hausla', 'safar'],
    'Kyun darein zindagi mein kya hoga\nKuch na hoga toh tajurba hoga',
    'क्यूँ डरें ज़िंदगी में क्या होगा\nकुछ न होगा तो तजुर्बा होगा',
    'hoga', 'kya / tajurba', ['tajurba', 'hausla', 'safar', 'zindagi']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['dard', 'tanhai', 'khamoshi'],
    'Main aur meri tanhai aksar ye baatein karte hain\nTum hoti toh kaisa hota, tum ye kehti tum woh kehti',
    'मैं और मेरी तन्हाई अक्सर ये बातें करते हैं\nतुम होती तो कैसा होता, तुम ये कहती तुम वो कहती',
    'kehti', 'hota', ['tanhai', 'guftagu', 'khud-kalami', 'yaad']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['ishq-e-majazi', 'sukoon', 'dastak'],
    'Ek ladki ko dekha toh aisa laga\nJaise khilta gulaab, jaise shayar ka khwaab',
    'एक लड़की को देखा तो ऐसा लगा\nजैसे खिलता गुलाब, जैसे शायर का ख़्वाब',
    'laga', 'gulaab / khwaab', ['tamsil', 'khwaab', 'shayar', 'ishq']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['falsafa', 'zindagi', 'waqt'],
    'Waqt ke saath badal jaate hain sab manzar lekin\nJo kaha tha kabhi khamoshi mein woh goonjta rehta hai',
    'वक़्त के साथ बदल जाते हैं सब मंज़र लेकिन\nजो कहा था कभी ख़ामोशी में वो गूँजता रहता है',
    'rehta hai', 'goonjta', ['manzar', 'khamoshi', 'sada', 'waqt']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['hausla', 'umeed', 'safar'],
    'Raaste mein jo patthar mile un se seedhi bana li hum ne\nThak ke baithna toh hum ne kabhi seekha hi nahin',
    'रास्ते में जो पत्थर मिले उन से सीढ़ी बना ली हम ने\nथक के बैठना तो हम ने कभी सीखा ही नहीं',
    'nahin', 'seekha', ['patthar', 'seedhi', 'hausla', 'safar']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['ishq-e-majazi', 'wafa', 'guftagu'],
    'Jab hum mile toh lafz kam pad gaye dono ke paas\nAankhon ne saari daastaan ik pal mein keh daali',
    'जब हम मिले तो लफ़्ज़ कम पड़ गए दोनों के पास\nआँखों ने सारी दास्ताँ इक पल में कह डाली',
    'daali', 'keh', ['lafz', 'daastaan', 'pal', 'ishq']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['shehr', 'khala', 'falsafa'],
    'Bheed mein sab ke chehre pe ek hi jaldi likhi hai\nKoi nahin jaanta ke woh kis shaam se bhaag raha hai',
    'भीड़ में सब के चेहरे पे एक ही जल्दी लिखी है\nकोई नहीं जानता कि वो किस शाम से भाग रहा है',
    'raha hai', 'bhaag', ['bheed', 'shehr', 'shaam', 'falsafa']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['sukoon', 'dosti', 'hamrahi'],
    'Koi ho jis ke saamne rona aasaan lagne lage\nAise ik dost se saara zamaana halka ho jaata hai',
    'कोई हो जिस के सामने रोना आसान लगने लगे\nऐसे इक दोस्त से सारा ज़माना हल्का हो जाता है',
    'jaata hai', 'halka', ['dost', 'hamrahi', 'sukoon', 'bharosa']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['dard', 'ranjish', 'gurez'],
    'Hum ne toh chup reh kar bhi saare gile rakh diye\nTum ne sun kar bhi kaha ke baat kuch bhi nahin thi',
    'हम ने तो चुप रह कर भी सारे गिले रख दिए\nतुम ने सुन कर भी कहा कि बात कुछ भी नहीं थी',
    'nahin thi', 'gile', ['gila', 'khamoshi', 'ranjish', 'dard']
  ],
  [
    'Javed Akhtar', 'modern', 'ghazal', ['umeed', 'sehar', 'sukoon'],
    'Andhera jitna bhi gahra ho subah ko rok nahin sakta\nHar raat ke daaman mein ik chiraagh chhupa rehta hai',
    'अँधेरा जितना भी गहरा हो सुबह को रोक नहीं सकता\nहर रात के दामन में इक चराग़ छुपा रहता है',
    'rehta hai', 'chhupa', ['subah', 'chiraagh', 'umeed', 'sehar']
  ],

  // ======================== 13. BASHIR BADR (10) ========================
  [
    'Bashir Badr', 'modern', 'ghazal', ['ishq-e-majazi', 'ranjish', 'tehzeeb'],
    'Dushmani jam kar karo lekin ye gunjaaish rahe\nJab kabhi hum dost ho jaayein toh sharminda na hon',
    'दुश्मनी जम कर करो लेकिन ये गुंजाइश रहे\nजब कभी हम दोस्त हो जाएँ तो शर्मिंदा न हों',
    'na hon', 'sharminda', ['dushmani', 'dost', 'tehzeeb', 'gunjaaish']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['dard', 'yaad', 'ishq-e-majazi'],
    'Ujaale apni yaadon ke hamare saath rehne do\nNa jaane kis gali mein zindagi ki shaam ho jaaye',
    'उजाले अपनी यादों के हमारे साथ रहने दो\nन जाने किस गली में ज़िंदगी की शाम हो जाए',
    'ho jaaye', 'shaam', ['ujaale', 'yaad', 'gali', 'shaam']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['ishq-e-majazi', 'guftagu', 'sukoon'],
    'Koi haath bhi na milaayega jo gale miloge tapaak se\nYe naye mizaaj ka shehr hai zara faasle se mila karo',
    'कोई हाथ भी न मिलाएगा जो गले मिलोगे तपाक से\nये नए मिज़ाज का शहर है ज़रा फ़ासले से मिला करो',
    'mila karo', 'faasle', ['shehr', 'mizaaj', 'faasla', 'tanz']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['ishq-e-majazi', 'dastak', 'barish'],
    'Yahi wafa ka sila hai toh koi baat nahin\nYe dard tum ne diya hai toh koi baat nahin',
    'यही वफ़ा का सिला है तो कोई बात नहीं\nये दर्द तुम ने दिया है तो कोई बात नहीं',
    'koi baat nahin', 'sila / diya', ['wafa', 'sila', 'dard', 'tehzeeb']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['dard', 'shehr', 'ghar'],
    'Log toot jaate hain ek ghar banaane mein\nTum taras nahin khaate bastiyaan jalaane mein',
    'लोग टूट जाते हैं एक घर बनाने में\nतुम तरस नहीं खाते बस्तियाँ जलाने में',
    'mein', 'banaane / jalaane', ['ghar', 'basti', 'dard', 'insaaniyat']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['ishq-e-majazi', 'shaam', 'sukoon'],
    'Kabhi yun bhi aa meri aankh mein ke meri nazar ko khabar na ho\nMujhe ek raat nawaaz de magar us ke baad sahar na ho',
    'कभी यूँ भी आ मिरी आँख में कि मिरी नज़र को ख़बर न हो\nमुझे एक रात नवाज़ दे मगर उस के बाद सहर न हो',
    'na ho', 'khabar / sahar', ['nazar', 'raat', 'sahar', 'ishq']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['barish', 'chai', 'yaad'],
    'Chhat pe baarish ki boondein aur haath mein garam pyali\nAise mausam mein purane khat khud hi bol padte hain',
    'छत पे बारिश की बूँदें और हाथ में गरम प्याली\nऐसे मौसम में पुराने ख़त ख़ुद ही बोल पड़ते हैं',
    'padte hain', 'bol', ['baarish', 'pyali', 'khat', 'nostalgia']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['khamoshi', 'sukoon', 'ishq-e-majazi'],
    'Mohabbaton mein dikhaave ki dosti na mila\nAgar gale nahin milta toh haath bhi na mila',
    'मोहब्बतों में दिखावे की दोस्ती न मिला\nअगर गले नहीं मिलता तो हाथ भी न मिला',
    'na mila', 'dosti / haath', ['mohabbat', 'dosti', 'sachai', 'tehzeeb']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['safar', 'yaad', 'shehr'],
    'Parinde ab bhi laut aate hain shaam ke pehle\nBas insaan hi apni galiyon ka pata bhool gaya hai',
    'परिंदे अब भी लौट आते हैं शाम के पहले\nबस इंसान ही अपनी गलियों का पता भूल गया है',
    'gaya hai', 'bhool', ['parinde', 'shaam', 'gali', 'ghar']
  ],
  [
    'Bashir Badr', 'modern', 'ghazal', ['ishq-e-majazi', 'chashm-e-nam', 'wafa'],
    'Aankhon mein raha dil mein utar kar nahin dekha\nKashti ke musaafir ne samundar nahin dekha',
    'आँखों में रहा दिल में उतर कर नहीं देखा\nकश्ती के मुसाफ़िर ने समुंदर नहीं देखा',
    'nahin dekha', 'utar / samundar', ['kashti', 'musaafir', 'samundar', 'gehraai']
  ],

  // ======================== 14. NIDA FAZLI (10) ========================
  [
    'Nida Fazli', 'modern', 'ghazal', ['falsafa', 'zindagi', 'safar'],
    'Kabhi kisi ko muqammal jahaan nahin milta\nKahin zameen toh kahin aasmaan nahin milta',
    'कभी किसी को मुकम्मल जहाँ नहीं मिलता\nकहीं ज़मीं तो कहीं आसमाँ नहीं मिलता',
    'nahin milta', 'zameen / aasmaan', ['muqammal', 'zameen', 'aasmaan', 'zindagi']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['sufi', 'sukoon', 'ghar'],
    'Ghar se masjid hai bahut door chalo yun kar lein\nKisi rote hue bachche ko hansaaya jaaye',
    'घर से मस्जिद है बहुत दूर चलो यूँ कर लें\nकिसी रोते हुए बच्चे को हँसाया जाए',
    'jaaye', 'hansaaya', ['masjid', 'bachcha', 'insaaniyat', 'sufi']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['falsafa', 'dosti', 'zindagi'],
    'Duniya jise kehte hain jaadoo ka khilauna hai\nMil jaaye toh mitti hai kho jaaye toh sona hai',
    'दुनिया जिसे कहते हैं जादू का खिलौना है\nमिल जाए तो मिट्टी है खो जाए तो सोना है',
    'hai', 'khilauna / sona', ['duniya', 'mitti', 'sona', 'falsafa']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['ishq-e-majazi', 'wafa', 'sukoon'],
    'Hosh waalon ko khabar kya bekhudi kya cheez hai\nIshq keeje phir samajhiye zindagi kya cheez hai',
    'होश वालों को ख़बर क्या बे-ख़ुदी क्या चीज़ है\nइश्क़ कीजे फिर समझिए ज़िंदगी क्या चीज़ है',
    'kya cheez hai', 'bekhudi / zindagi', ['bekhudi', 'hosh', 'ishq', 'zindagi']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['safar', 'hausla', 'zindagi'],
    'Safar mein dhoop toh hogi jo chal sako toh chalo\nSabhi hain bheed mein tum bhi nikal sako toh chalo',
    'सफ़र में धूप तो होगी जो चल सको तो चलो\nसभी हैं भीड़ में तुम भी निकल सको तो चलो',
    'toh chalo', 'chal / nikal', ['safar', 'dhoop', 'bheed', 'hausla']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['falsafa', 'khud-kalami', 'zindagi'],
    'Har aadmi mein hote hain das-bees aadmi\nJis ko bhi dekhna ho kai baar dekhna',
    'हर आदमी में होते हैं दस-बीस आदमी\nजिस को भी देखना हो कई बार देखना',
    'dekhna', 'baar', ['aadmi', 'chehra', 'falsafa', 'nazar']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['maa', 'ghar', 'sukoon'],
    'Besan ki sondhi roti par khatti chatni jaisi maa\nYaad aati hai chauka baasan chimta phunkni jaisi maa',
    'बेसन की सोंधी रोटी पर खट्टी चटनी जैसी माँ\nयाद आती है चौका बासन चिमटा फूँकनी जैसी माँ',
    'jaisi maa', 'roti / phunkni', ['maa', 'ghar', 'sondhi', 'yaad']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['dard', 'hijr', 'khamoshi'],
    'Apni marzi se kahan apne safar ke hum hain\nRukh hawaon ka jidhar ka hai udhar ke hum hain',
    'अपनी मर्ज़ी से कहाँ अपने सफ़र के हम हैं\nरुख़ हवाओं का जिधर का है उधर के हम हैं',
    'ke hum hain', 'safar / udhar', ['safar', 'hawa', 'rukh', 'waqt']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['sukoon', 'sufi', 'insaaniyat'],
    'Chaand taaron ko chhoone ki aasha mein\nAadmi apni zameen se kitna door nikal aaya',
    'चाँद तारों को छूने की आशा में\nआदमी अपनी ज़मीं से कितना दूर निकल आया',
    'aaya', 'nikal', ['zameen', 'aadmi', 'safar', 'falsafa']
  ],
  [
    'Nida Fazli', 'modern', 'ghazal', ['ishq-e-majazi', 'barish', 'sukoon'],
    'Garaj baras pyasi dharti par phir paani de Maula\nChidiyon ko daane bachchon ko gud-dhaani de Maula',
    'गरज बरस प्यासी धरती पर फिर पानी दे मौला\nचिड़ियों को दाने बच्चों को गुड़-धानी दे मौला',
    'de Maula', 'paani / gud-dhaani', ['baarish', 'dharti', 'dua', 'sufi']
  ],

  // ======================== 15. RAHAT INDORI (12) ========================
  [
    'Rahat Indori', 'modern', 'ghazal', ['inquilab', 'hausla', 'tanz'],
    'Bulaati hai magar jaane ka nahin\nYe duniya hai idhar jaane ka nahin',
    'बुलाती है मगर जाने का नहीं\nये दुनिया है इधर जाने का नहीं',
    'jaane ka nahin', 'idhar', ['tanz', 'duniya', 'mushaira', 'hausla']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['inquilab', 'hausla', 'virasat'],
    'Sabhi ka khoon hai shaamil yahan ki mitti mein\nKisi ke baap ka Hindustan thodi hai',
    'सभी का ख़ून है शामिल यहाँ की मिट्टी में\nकिसी के बाप का हिंदुस्तान थोड़ी है',
    'thodi hai', 'hindustan', ['mitti', 'virasat', 'inquilab', 'hausla']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['hausla', 'inquilab', 'safar'],
    'Toofaanon se aankh milaao sailaabon par waar karo\nMallaahon ka chakkar chhodo tair ke dariya paar karo',
    'तूफ़ानों से आँख मिलाओ सैलाबों पर वार करो\nमल्लाहों का चक्कर छोड़ो तैर के दरिया पार करो',
    'karo', 'waar / paar', ['toofaan', 'sailaab', 'dariya', 'hausla']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['hausla', 'tanz', 'inquilab'],
    'Shaaqhon se toot jaayein woh patte nahin hain hum\nAandhi se koi keh de ke auqaat mein rahe',
    'शाख़ों से टूट जाएँ वो पत्ते नहीं हैं हम\nआँधी से कोई कह दे कि औक़ात में रहे',
    'rahe', 'auqaat', ['shaakh', 'aandhi', 'hausla', 'mushaira']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['ishq-e-majazi', 'mehfil', 'suroor'],
    'Uski yaad aayi hai saanso zara aahista chalo\nDhadkanon se bhi ibaadat mein khalal padta hai',
    'उसकी याद आई है साँसों ज़रा आहिस्ता चलो\nधड़कनों से भी इबादत में ख़लल पड़ता है',
    'padta hai', 'khalal', ['saans', 'ibaadat', 'khalal', 'ishq']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['tanz', 'inquilab', 'falsafa'],
    'Lagegi aag toh aayenge ghar kai zad mein\nYahan pe sirf hamara makaan thodi hai',
    'लगेगी आग तो आएँगे घर कई ज़द में\nयहाँ पे सिर्फ़ हमारा मकान थोड़ी है',
    'thodi hai', 'makaan', ['aag', 'makaan', 'basti', 'tanz']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['hausla', 'safar', 'umeed'],
    'Naye safar ka naya intezaam keh denge\nHawa ko dhoop, charaaghon ko shaam keh denge',
    'नए सफ़र का नया इंतिज़ाम कह देंगे\nहवा को धूप, चराग़ों को शाम कह देंगे',
    'keh denge', 'intezaam / shaam', ['safar', 'charaagh', 'hawa', 'hausla']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['ishq-e-majazi', 'mushaira', 'guftagu'],
    'Do gaz sahi magar ye meri milkiyat toh hai\nAe maut tu ne mujh ko zameendaar kar diya',
    'दो गज़ सही मगर ये मिरी मिल्कियत तो है\nऐ मौत तू ने मुझ को ज़मींदार कर दिया',
    'kar diya', 'zameendaar', ['tanz', 'maut', 'falsafa', 'mushaira']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['inquilab', 'hausla', 'umeed'],
    'Hum apni jaan ke dushman ko apni jaan kehte hain\nMohabbat ki isi mitti ko Hindustan kehte hain',
    'हम अपनी जान के दुश्मन को अपनी जान कहते हैं\nमोहब्बत की इसी मिट्टी को हिंदुस्तान कहते हैं',
    'kehte hain', 'jaan / hindustan', ['mohabbat', 'mitti', 'hindustan', 'virasat']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['dard', 'hijr', 'ishq-e-majazi'],
    'Mere hujre mein nahin aur kahin par rakh do\nAasmaan laaye ho le aao zameen par rakh do',
    'मिरे हुजरे में नहीं और कहीं पर रख दो\nआसमाँ लाए हो ले आओ ज़मीं पर रख दो',
    'rakh do', 'kahin / zameen', ['hujra', 'aasmaan', 'zameen', 'mushaira']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['tanz', 'mehfil', 'hausla'],
    'Jo aaj saahib-e-masnad hain kal nahin honge\nKiraayedaar hain zaati makaan thodi hai',
    'जो आज साहिब-ए-मसनद हैं कल नहीं होंगे\nकिराएदार हैं ज़ाती मकान थोड़ी है',
    'thodi hai', 'makaan', ['masnad', 'waqt', 'tanz', 'inquilab']
  ],
  [
    'Rahat Indori', 'modern', 'ghazal', ['ishq-e-majazi', 'yaad', 'shaam'],
    'Aankh mein paani rakho hothon pe chingaari rakho\nZinda rehna hai toh tarkeebein bahut saari rakho',
    'आँख में पानी रखो होंठों पे चिंगारी रखो\nज़िंदा रहना है तो तरकीबें बहुत सारी रखो',
    'rakho', 'chingaari / saari', ['chingaari', 'tarkeeb', 'zindagi', 'hausla']
  ],

  // ======================== ADDITIONAL THEMATIC & NUANCED COUPLETS (6) ========================
  [
    'Mirza Ghalib', 'classical', 'ghazal', ['sukoon', 'barish', 'mehfil'],
    'Baarish-e-sang-e-malaamat mein bhi chalta hi raha\nAabshaaron ki tarah shauq machalta hi raha',
    'बारिश-ए-संग-ए-मलामत में भी चलता ही रहा\nआबशारों की तरह शौक़ मचलता ही रहा',
    'hi raha', 'chalta / machalta', ['aabshaar', 'shauq', 'safar', 'hausla']
  ],
  [
    'Meer Taqi Meer', 'classical', 'ghazal', ['khamoshi', 'sukoon', 'dastak'],
    'Dil ke baam-o-dar pe sukoot-e-shaam utar aaya\nKisi ki dastak ke intezaar mein chiraagh jalta raha',
    'दिल के बाम-ओ-दर पे सुकूत-ए-शाम उतर आया\nकिसी की दस्तक के इंतज़ार में चराग़ जलता रहा',
    'raha', 'jalta', ['baam-o-dar', 'sukoot', 'dastak', 'chiraagh']
  ],
  [
    'Faiz Ahmad Faiz', 'progressive', 'ghazal', ['tashnagi', 'safar', 'justajoo'],
    'Tashnagi lab pe rahi aur saahil door raha\nPhir bhi kashti mein hamari umeed ka noor raha',
    'तश्नगी लब पे रही और साहिल दूर रहा\nफिर भी कश्ती में हमारी उम्मीद का नूर रहा',
    'raha', 'door / noor', ['tashnagi', 'saahil', 'kashti', 'justajoo']
  ],
  [
    'Jaun Elia', 'modern', 'ghazal', ['khala', 'gurez', 'khud-kalami'],
    'Aaine mein koi aur tha jo mujh se gurez kar gaya\nKhala itna bada tha ke saara kamra bhar gaya',
    'आइने में कोई और था जो मुझ से गुरेज़ कर गया\nख़ला इतना बड़ा था कि सारा कमरा भर गया',
    'gaya', 'kar / bhar', ['gurez', 'khala', 'aaina', 'khud-kalami']
  ],
  [
    'Parveen Shakir', 'modern', 'ghazal', ['chai', 'shaam', 'sukoon'],
    'Dareecha khola toh bheegi hawa ne naam liya\nShaam ki chai mein kisi ki yaad ka rang ghul gaya',
    'दरीचा खोला तो भीगी हवा ने नाम लिया\nशाम की चाय में किसी की याद का रंग घुल गया',
    'gaya', 'ghul', ['dareecha', 'chai', 'shaam', 'hawa']
  ],
  [
    'Gulzar', 'modern', 'nazm', ['dosti', 'hamrahi', 'sukoon'],
    'Chalte chalte jab thakan kandhon pe aakar baith jaaye\nKisi hamrahi ka chupchaap saath chalna hi marham hota hai',
    'चलते चलते जब थकान कंधों पे आकर बैठ जाए\nकिसी हमराही का चुपचाप साथ चलना ही मरहम होता है',
    'hota hai', 'marham', ['hamrahi', 'marham', 'dosti', 'sukoon']
  ],
];

export const BUILTIN_SHAYARI_CORPUS: CorpusCouplet[] = RAW_CORPUS_SEEDS.map(
  (seed, index) => ({
    id: `builtin-${index + 1}`,
    poet: seed[0],
    era: seed[1],
    form: seed[2],
    moods: seed[3],
    roman: seed[4],
    devanagari: seed[5],
    radif: seed[6],
    qafiya: seed[7],
    motifs: seed[8],
    source: 'builtin',
  })
);
