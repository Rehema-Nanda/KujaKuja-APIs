UPDATE public.countries
SET updated_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
geojson='{"type":"Feature","properties":{"name":"Uganda","tiny":-99,"type":"Sovereigncountry","admin":"Uganda","gu_a3":"UGA","level":2,"su_a3":"UGA","un_a3":"800","wb_a2":"UG","wb_a3":"UGA","abbrev":"Uga.","brk_a3":"UGA","iso_a2":"UG","iso_a3":"UGA","iso_n3":"800","postal":"UG","sov_a3":"UGA","su_dif":0,"woe_id":-99,"adm0_a3":"UGA","economy":"7.Leastdevelopedregion","fips_10":null,"geounit":"Uganda","pop_est":32369558,"subunit":"Uganda","adm0_dif":0,"brk_diff":0,"brk_name":"Uganda","filename":"UGA.geojson","gdp_year":-99,"geou_dif":0,"homepart":1,"long_len":6,"name_alt":null,"name_len":6,"note_brk":null,"pop_year":-99,"brk_group":null,"continent":"Africa","formal_en":"RepublicofUganda","formal_fr":null,"labelrank":3,"mapcolor7":6,"mapcolor8":3,"mapcolor9":6,"name_long":"Uganda","name_sort":"Uganda","note_adm0":null,"region_un":"Africa","region_wb":"Sub-SaharanAfrica","scalerank":1,"subregion":"EasternAfrica","wikipedia":-99,"abbrev_len":4,"adm0_a3_is":"UGA","adm0_a3_un":-99,"adm0_a3_us":"UGA","adm0_a3_wb":-99,"featurecla":"Admin-0country","gdp_md_est":39380,"income_grp":"5.Lowincome","lastcensus":2002,"mapcolor13":4,"sovereignt":"Uganda"},"geometry":{"type":"Polygon","coordinates":[[[29.98237609863281,0.5163504323777589],[29.870452880859375,0.38795174748133154],[29.820327758789062,0.16616797994936602],[29.782562255859375,0.16754126514173667],[29.718704223632812,0.0782775635396999],[29.737243652343746,-0.027465819260582135],[29.652099609375,-0.4586743000357256],[29.683685302734375,-0.5671599268994486],[29.645233154296875,-0.5980573769534784],[29.636993408203125,-0.8987821064906327],[29.586181640625,-0.8994686674532449],[29.57382202148438,-1.1850656425056503],[29.608840942382816,-1.2200768496838812],[29.5916748046875,-1.3862020273589],[29.67750549316406,-1.377964678371303],[29.719390869140625,-1.3374639680603773],[29.75372314453125,-1.3381504264031814],[29.796981811523438,-1.3690408514928316],[29.82650756835937,-1.3079460789741424],[29.917831420898438,-1.4802430218864946],[30.167770385742188,-1.3415827152334823],[30.34492492675781,-1.1246531145449754],[30.353851318359375,-1.0621797541900218],[30.65322875976562,-1.0621797541900218],[30.76583862304687,-0.9804819272097239],[30.804977416992184,-0.9983320485749159],[33.936767578125,-0.9887204566941844],[33.98345947265625,-0.13458239577451545],[33.9093017578125,0.11535636737820079],[34.112548828125,0.3872651176859056],[34.08233642578125,0.4669137773332418],[34.2828369140625,0.6564187452630884],[34.5355224609375,1.1095497845377595],[34.793701171875,1.2303741774326145],[34.837646484375,1.2935302390231982],[34.79644775390625,1.411600338923334],[34.92553710937499,1.5735936415541505],[34.98870849609375,1.6834125323078375],[34.9200439453125,2.41353151190461],[34.96124267578125,2.4656692707025543],[34.77447509765625,2.70712209411511],[34.71405029296875,2.8772079526533365],[34.5684814453125,3.126803728296058],[34.40093994140625,3.4887479424812566],[34.453125,3.683373343187846],[33.9971923828125,4.234116978858444],[33.51654052734375,3.760115447396889],[33.1787109375,3.784781124382708],[33.02490234375,3.9026184734373017],[32.7337646484375,3.7738186877268247],[32.4261474609375,3.7518933997599233],[32.19818115234375,3.601142320158735],[32.1954345703125,3.5161624613627884],[32.08831787109375,3.5408348394316715],[31.813659667968746,3.817667600245491],[31.530761718750004,3.655963837937759],[31.280822753906246,3.7957434222874658],[31.168212890625004,3.7984839750369748],[30.863342285156246,3.505196750176222],[30.9429931640625,3.4997138463498842],[30.91552734375,3.3790819323419834],[30.7672119140625,3.0500111336512017],[30.8880615234375,2.8607491158660143],[30.750732421874996,2.605607770806103],[30.742492675781246,2.454693068753791],[30.9320068359375,2.331204680180623],[30.992431640624996,2.41353151190461],[31.3055419921875,2.1500689371866524],[30.4705810546875,1.208406497271858],[30.267333984374996,1.1672166206429324],[30.1629638671875,0.9090805073229825],[29.99542236328125,0.8541553715898037],[29.959716796875004,0.6399403076517367],[29.98237609863281,0.5163504323777589]]]}}'
WHERE name = 'Uganda';