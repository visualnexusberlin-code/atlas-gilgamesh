import json, base64, io, re, subprocess, html, sys
from PIL import Image
import os as _os
D=_os.path.dirname(_os.path.abspath(__file__))+'/'
RAIZ=_os.path.dirname(D.rstrip('/'))+'/'
def b64(path): return base64.b64encode(open(path,'rb').read()).decode()
def webp(path, maxw=1440, q=82):
    im=Image.open(path).convert('RGB')
    if im.width>maxw: im=im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return im.size, 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
NUM=['𒁹','𒈫','𒐈','𒐉','𒐊','𒐋','𒐌','𒐍','𒐎','𒌋','𒌋𒁹','𒌋𒈫']
SIG=['𒀭𒄑 𒌷𒀕','𒀭𒀀𒊒𒊒 𒀭𒂗𒆠𒆕','𒀭𒂗𒆠𒆕','𒀭𒄑 𒀭𒂗𒆠𒆕','𒀭𒌓','𒄷𒉿𒉿','𒀭𒈹','𒀭𒂗𒆠𒆕','𒆳𒈠𒋗','𒌓𒍣','𒀭𒄑','𒌷𒀕']
LEC={'es':['ᵈGIŠ · URU.UNUG — Gilgameš · Uruk','ᵈa-ru-ru · ᵈen-ki-dù — Aruru · Enkidu','ᵈen-ki-dù — Enkidu','ᵈGIŠ · ᵈen-ki-dù — Gilgameš · Enkidu','ᵈUTU — Šamaš, el Sol','ḫu-wa-wa — Ḫuwawa (Humbaba)','ᵈINANNA — Ištar','ᵈen-ki-dù — Enkidu','KUR ma-šu — el monte Mašu','UD.ZI — Uta-napišti','ᵈGIŠ — Gilgameš','URU.UNUG — Uruk'],
     'en':['ᵈGIŠ · URU.UNUG — Gilgamesh · Uruk','ᵈa-ru-ru · ᵈen-ki-dù — Aruru · Enkidu','ᵈen-ki-dù — Enkidu','ᵈGIŠ · ᵈen-ki-dù — Gilgamesh · Enkidu','ᵈUTU — Shamash, the Sun','ḫu-wa-wa — Huwawa (Humbaba)','ᵈINANNA — Ishtar','ᵈen-ki-dù — Enkidu','KUR ma-šu — Mount Mashu','UD.ZI — Uta-napishti','ᵈGIŠ — Gilgamesh','URU.UNUG — Uruk']}
INCIPIT='𒊭𒅘𒁀𒄿𒈬𒊒'
T={
'es':dict(lang='es',locale='es_ES',canon='https://epic-gilgamesh.web.app/',title='Gilgamesh — La Memoria de Uruk | Recorrido por la epopeya',
 desc='Recorrido tridimensional por doce pasajes de la Epopeya de Gilgamesh: de la tiranía de Uruk al cielo abierto sobre sus murallas. Textos, citas de dominio público y una arquitectura que narra la transformación del héroe.',
 ogtitle='Gilgamesh — La Memoria de Uruk',ogdesc='Doce estaciones para habitar la epopeya más antigua conservada. Un recorrido donde la arquitectura narra el viaje interior de Gilgamesh.',
 ldesc='Experiencia web interactiva que recorre doce pasajes de la Epopeya de Gilgamesh a través de un espacio tridimensional procesional.',
 salta='Ir directamente al texto',subtitulo='La memoria de Uruk',idiomaAria='Idioma',otroHref='/en',otroLang='en',otroNombre='English',otroCorto='EN',
 incipitCun=INCIPIT,incipitLectura='ša nag-ba i-mu-ru · «El que vio lo profundo», primeras palabras del poema',
 entradilla='Doce pasajes del poema más antiguo que se conserva, recorridos a pie. El camino empieza entre muros estrechos y termina bajo el cielo abierto: el espacio se ensancha a medida que el rey aprende que va a morir.',
 preparando='Preparando el recorrido…',leer='Leer los doce pasajes',tablillaUmbral='Ver en escritura cuneiforme',
 nota='Unos quince minutos. Se avanza con la rueda, las flechas o deslizando el dedo. Con sonido.',coleccion='Biblioteca Visual de la Antigüedad',
 salir='Salir',texto='Texto',tablilla='Tablilla',tablillaTitulo='Escritura cuneiforme',sonido='Sonido',espina='Estaciones del recorrido',anterior='Estación anterior',siguiente='Estación siguiente',
 guia='Avanza con la rueda o las flechas',cerrar='Cerrar',lecturaTitulo='Doce pasajes de la Epopeya de Gilgamesh',
 lecturaIntro='Escrita en tablillas de arcilla hace más de cuatro mil años, la epopeya cuenta cómo un rey invencible descubre la muerte a través de la pérdida de un amigo. Estos son los doce episodios que sostienen la obra, cada uno con un pasaje del poema. Cada uno corresponde a una sala del recorrido tridimensional.',
 notaTablilla='Modo tablilla: los signos muestran nombres propios, numerales y las primeras palabras del poema en su escritura original, el cuneiforme acadio (tipografía Noto Sans Cuneiform, licencia OFL). No son una traducción de los textos.',
 testimonios='Testimonios',testimoniosIntro='Piezas reales repartidas por el recorrido, entre estación y estación. No ilustran el relato: lo acreditan.',
 volverRecorrido='Volver al recorrido',transparencia='Transparencia',metodologia='Metodología',metodHref='/metodologia',volverUmbral='Volver al umbral',
 pie=['Esta experiencia ha sido concebida, investigada y dirigida por su autor. Durante el proceso de diseño, programación, traducción y producción se han utilizado herramientas de inteligencia artificial como apoyo creativo y técnico. La selección, organización, revisión y dirección editorial del contenido corresponden al autor.',
      'Las imágenes de las estaciones han sido generadas con inteligencia artificial y así se indica junto a cada una. La arquitectura, las texturas y el sonido del recorrido se generan por código en el propio navegador.',
      'Las citas son traducción propia sobre las versiones inglesas de dominio público de W. Muss-Arnolt (1901) y M. Jastrow y A. T. Clay (1920). Los signos cuneiformes usan la tipografía Noto Sans Cuneiform (SIL Open Font License).',
      'Esta página no usa cookies, no carga recursos de terceros y no registra ningún dato de quien la visita.'],
 estacion='Estación',citaPie='Epopeya de Gilgamesh · traducción propia sobre Muss-Arnolt (1901) y Jastrow y Clay (1920), dominio público',ia='Imagen generada con inteligencia artificial.',
 js=dict(entrar='Entrar en el recorrido',estacion='Estación',mirTitulo='Uruk, la que perdura',mirCuerpo='Doce pasajes después, el recorrido termina donde empezó el poema: sobre las murallas, mirando la ciudad. Lo que el rey no pudo guardar para sí quedó en el ladrillo.',volverUmbral='Volver al umbral',leer='Leer los doce pasajes',ia='Relieve generado con inteligencia artificial')),
'en':dict(lang='en',locale='en_GB',canon='https://epic-gilgamesh.web.app/en',title='Gilgamesh — The Memory of Uruk | A journey through the epic',
 desc='A three-dimensional walk through twelve passages of the Epic of Gilgamesh: from the tyranny of Uruk to the open sky above its walls. Texts, public-domain quotations and an architecture that tells the hero’s transformation.',
 ogtitle='Gilgamesh — The Memory of Uruk',ogdesc='Twelve stations to inhabit the oldest surviving epic. A journey in which architecture tells the inner voyage of Gilgamesh.',
 ldesc='Interactive web experience that walks through twelve passages of the Epic of Gilgamesh in a processional three-dimensional space.',
 salta='Skip to the text',subtitulo='The memory of Uruk',idiomaAria='Language',otroHref='/',otroLang='es',otroNombre='Español',otroCorto='ES',
 incipitCun=INCIPIT,incipitLectura='ša nag-ba i-mu-ru · “He who saw the Deep”, the opening words of the poem',
 entradilla='Twelve passages of the oldest surviving poem, walked on foot. The path begins between narrow walls and ends beneath the open sky: the space widens as the king learns that he must die.',
 preparando='Preparing the journey…',leer='Read the twelve passages',tablillaUmbral='View in cuneiform script',
 nota='About fifteen minutes. Move with the mouse wheel, the arrow keys or a swipe. With sound.',coleccion='Visual Library of Antiquity',
 salir='Exit',texto='Text',tablilla='Tablet',tablillaTitulo='Cuneiform script',sonido='Sound',espina='Stations of the journey',anterior='Previous station',siguiente='Next station',
 guia='Move on with the wheel or the arrow keys',cerrar='Close',lecturaTitulo='Twelve passages from the Epic of Gilgamesh',
 lecturaIntro='Written on clay tablets more than four thousand years ago, the epic tells how an invincible king discovers death through the loss of a friend. These are the twelve episodes that hold the work together, each with a passage from the poem. Each corresponds to a room of the three-dimensional journey.',
 notaTablilla='Tablet mode: the signs show proper names, numerals and the opening words of the poem in their original script, Akkadian cuneiform (Noto Sans Cuneiform typeface, OFL licence). They are not a translation of the texts.',
 testimonios='Testimonies',testimoniosIntro='Real artefacts placed along the journey, between one station and the next. They do not illustrate the story: they bear witness to it.',
 volverRecorrido='Back to the journey',transparencia='Transparency',metodologia='Methodology',metodHref='/en/metodologia',volverUmbral='Back to the threshold',
 pie=['This experience was conceived, researched and directed by its author. Artificial intelligence tools were used as creative and technical support during design, programming, translation and production. The selection, organisation, review and editorial direction of the content are the author’s.',
      'The station images were generated with artificial intelligence, and this is stated next to each one. The architecture, textures and sound of the journey are generated by code in the browser itself.',
      'Quotations are our own rendering based on the public-domain English versions by W. Muss-Arnolt (1901) and M. Jastrow and A. T. Clay (1920). Cuneiform signs use the Noto Sans Cuneiform typeface (SIL Open Font License).',
      'This page uses no cookies, loads no third-party resources and records no data about its visitors.'],
 estacion='Station',citaPie='Epic of Gilgamesh · our rendering based on Muss-Arnolt (1901) and Jastrow and Clay (1920), public domain',ia='Image generated with artificial intelligence.',
 js=dict(entrar='Enter the journey',estacion='Station',mirTitulo='Uruk, which endures',mirCuerpo='Twelve passages later, the journey ends where the poem began: on the walls, looking at the city. What the king could not keep for himself remained in the brick.',volverUmbral='Back to the threshold',leer='Read the twelve passages',ia='Relief generated with artificial intelligence'))
}
alts_es={'e10':'Altorrelieve: un anciano sabio de túnica blanca sentado bajo un árbol milenario; al fondo, el arca encallada en la cima de la montaña tras el Diluvio.',
      'e12':'Altorrelieve mesopotámico: una figura alada de barba rizada emerge de la piedra, y a su derecha una hendidura de luz atraviesa la roca hacia lo que se abre más allá.'}
prompt_orig={'e12':'Un encuentro espectral en un lugar de penumbra absoluta; Gilgamesh se inclina ante una sombra transparente que emerge de una grieta en la tierra para susurrarle verdades amargas.'}

# imágenes: se codifican una vez y se comparten entre idiomas
cache={}
def img(path, maxw=1440, q=82):
    if path not in cache: cache[path]=webp(path,maxw,q)
    return cache[path]

fonts=''
for fam,file,wt,st in [('Cormorant Garamond','cormorant-garamond-latin-500-normal',500,'normal'),('Cormorant Garamond','cormorant-garamond-latin-500-italic',500,'italic'),('Cormorant Garamond','cormorant-garamond-latin-600-normal',600,'normal'),('Alegreya Sans','alegreya-sans-latin-300-normal',300,'normal'),('Alegreya Sans','alegreya-sans-latin-400-normal',400,'normal'),('Alegreya Sans','alegreya-sans-latin-500-normal',500,'normal'),('LU','cun',400,'normal'),('CUN','cun',400,'normal')]:
    fonts+=f'@font-face{{font-family:"{fam}";font-style:{st};font-weight:{wt};font-display:block;src:url(data:font/woff2;base64,{b64(D+"fonts/"+file+".woff2")}) format("woff2");}}\n'
r=subprocess.run(['npx','esbuild','src/main.js','--bundle','--format=iife','--minify','--target=es2020','--legal-comments=none','--charset=utf8'],cwd=D,capture_output=True,text=True)
if r.returncode: print(r.stderr); sys.exit(1)
js=r.stdout.replace('</script','<\\/script')
import os
for L in ['es','en']:
    t=T[L]
    datos=json.load(open(D+'contenido/'+('content.json' if L=='es' else 'content_en.json')))
    est=[]
    for i,d in enumerate(datos):
        sid=d['id']; f=D+'assets/'+(d.get('img') or (sid+'.jpg'))
        (w,h),uri=img(f)
        alt=d.get('alt') or alts_es[sid]
        pr=prompt_orig.get(sid,d['prompt'])
        est.append(f'''  <section class="estacion" id="{sid}" data-lugar="{html.escape(d['lugar'])}">
    <p class="cun-linea" lang="akk-Xsux"><span class="cun">{NUM[i]}&#8195;{SIG[i]}</span><span class="lectura-cun">{LEC[L][i]}</span></p>
    <h2><span class="num">{t['estacion']} {ROM[i]} · {html.escape(d['lugar'])}</span><span class="t">{d['titulo']}</span></h2>
    <div class="cuerpo"><p>{d['cuerpo']}</p></div>
    <blockquote class="cita"><p>{html.escape(d['cita'])}</p><footer>{t['citaPie']}</footer></blockquote>
    <div class="tablilla"><figure data-prompt="{html.escape(pr)}">
      <img src="{uri}" width="{w}" height="{h}" alt="{html.escape(alt)}" decoding="async">
      <figcaption>{t['ia']}</figcaption>
    </figure></div>
  </section>''')
    piezas=json.load(open(D+'contenido/'+('piezas.json' if L=='es' else 'piezas_en.json')))
    tes=[]
    for p in piezas:
        (w,h),uri=img(D+'assets/'+p['archivo'],1200,84)
        tes.append(f'''      <figure data-estacion="{p['estacion']}" data-aspecto="{w/h:.4f}">
        <img src="{uri}" width="{w}" height="{h}" alt="{html.escape(p['titulo'])}" decoding="async">
        <figcaption><h3>{html.escape(p['titulo'])}</h3><p>{html.escape(p['nota'])}</p></figcaption>
      </figure>''')
    out=open(D+'template.html').read()
    vals={**t,'pieParrafos':'\n'.join(f'    <p>{x}</p>' for x in t['pie'])}
    vals['incipitCun']=''.join(f'<span class="sg" style="--i:{k}">{c}</span>' for k,c in enumerate(INCIPIT))
    out=re.sub(r'\{\{t:(\w+)\}\}', lambda m: str(vals[m.group(1)]), out)
    cun={'incipit':INCIPIT,'incipitLectura':t['incipitLectura'],'estaciones':[{'num':NUM[i],'signos':SIG[i],'lectura':LEC[L][i]} for i in range(12)]}
    out=out.replace('{{FONTS}}',fonts).replace('{{ESTACIONES}}','\n'.join(est)).replace('{{TESTIMONIOS}}','\n'.join(tes))
    out=out.replace('{{TXTJSON}}',json.dumps(t['js'],ensure_ascii=False)).replace('{{CUNJSON}}',json.dumps(cun,ensure_ascii=False)).replace('{{JS}}',js)
    destino=RAIZ+('index.html' if L=='es' else 'en/index.html')
    os.makedirs(os.path.dirname(destino),exist_ok=True)
    open(destino,'w').write(out)
    print(L,'ok', len(out)//1024,'KB')

# metodología: misma tipografía incrustada, sin recursos externos
cascara=open(D+'metodologia/shell.html').read()
for L,dest,title,desc,canon in [('es','metodologia.html','Metodología · Gilgamesh — La Memoria de Uruk','Cómo se ha hecho la experiencia Gilgamesh — La Memoria de Uruk: fuentes, herramientas, criterios editoriales y autoría.','https://epic-gilgamesh.web.app/metodologia'),
                                ('en','en/metodologia.html','Methodology · Gilgamesh — The Memory of Uruk','How Gilgamesh — The Memory of Uruk was made: sources, tools, editorial criteria and authorship.','https://epic-gilgamesh.web.app/en/metodologia')]:
    cuerpo=open(D+'metodologia/'+L+'.html').read()
    out=cascara.replace('{{lang}}',L).replace('{{title}}',title).replace('{{desc}}',desc).replace('{{canon}}',canon).replace('{{FONTS}}',fonts).replace('{{CUERPO}}',cuerpo)
    open(RAIZ+dest,'w').write(out); print(dest,'ok',len(out)//1024,'KB')
