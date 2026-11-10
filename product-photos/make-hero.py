from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
P=os.path.expanduser('~/mnt/levix Final pro/product-photos/')
F='/usr/share/fonts/truetype/google-fonts/'
bold=lambda s: ImageFont.truetype(F+'Poppins-Bold.ttf', s)
med=lambda s: ImageFont.truetype(F+('Poppins-Medium.ttf' if os.path.exists(F+'Poppins-Medium.ttf') else 'Poppins-Regular.ttf'), s)

def grad(w,h,top,bot,glow=None):
    im=Image.new('RGB',(w,h),top); d=ImageDraw.Draw(im)
    for y in range(h):
        t=y/(h-1); d.line([(0,y),(w,y)],fill=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)))
    if glow:
        g=Image.new('L',(w,h),0); ImageDraw.Draw(g).ellipse([w*0.15,h*0.05,w*0.85,h*0.9],fill=110)
        g=g.filter(ImageFilter.GaussianBlur(w//8)); im=Image.composite(Image.new('RGB',(w,h),glow),im,g)
    return im

def panel(path,w,h,r):
    im=Image.open(P+path).convert('RGB'); s=max(w/im.width,h/im.height); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    x=(im.width-w)//2; y=min(int((im.height-h)*0.15), im.height-h); im=im.crop((x,y,x+w,y+h))
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).rounded_rectangle([0,0,w-1,h-1],r,fill=255); return im,m

def paste(bg,path,x,y,w,h,r=26,shadow=True):
    im,m=panel(path,w,h,r)
    if shadow:
        sh=Image.new('L',bg.size,0); ImageDraw.Draw(sh).rounded_rectangle([x+6,y+18,x+w+6,y+h+18],r,fill=150)
        sh=sh.filter(ImageFilter.GaussianBlur(22)); bg.paste(Image.new('RGB',bg.size,(0,0,0)),(0,0),sh)
    bg.paste(im,(x,y),m)

def ctext(d,cx,y,txt,font,fill,spacing=0):
    if spacing:
        widths=[d.textlength(c,font=font) for c in txt]; total=sum(widths)+spacing*(len(txt)-1); x=cx-total/2
        for c,wd in zip(txt,widths): d.text((x,y),c,font=font,fill=fill); x+=wd+spacing
    else:
        d.text((cx-d.textlength(txt,font=font)/2,y),txt,font=font,fill=fill)

picks=['02-acid-lone-wolf-red/1.jpg','06-overlength-porsche-off-white-3rd-drop/1.jpg','08-overlength-hare-krishna-navy-2nd-drop/4.jpg','09-overlength-levix-peacock-white/2.jpg','12-overlength-doom-black/1.jpg']

# Desktop 2400x1200 (dark)
W,H=2400,1200; bg=grad(W,H,(30,30,32),(10,10,11),glow=(58,58,62)); d=ImageDraw.Draw(bg)
ctext(d,W/2,95,'LEVIX',bold(215),(245,245,245),spacing=40)
ctext(d,W/2,350,'OVERLENGTH   ·   WAFFLE   ·   ACID WASH   —   NEW DROPS LIVE',med(30),(175,175,175),spacing=3)
pw,gap=404,30; x0=(W-(5*pw+4*gap))//2; y0,ph=430,600
for i,p in enumerate(picks): paste(bg,p,x0+i*(pw+gap),y0+(0 if i in (0,4) else -20 if i==2 else -10),pw,ph+ (0 if i in (0,4) else 20 if i==2 else 10))
bg.save(os.path.expanduser('~/mnt/levix Final pro/product-photos/hero-desktop.jpg'),quality=88,optimize=True,progressive=True)

# Mobile 1080x1920 (light)
W,H=1080,1920; bg=grad(W,H,(240,238,234),(214,210,203)); d=ImageDraw.Draw(bg)
ctext(d,W/2,230,'LEVIX',bold(190),(17,17,17),spacing=24)
ctext(d,W/2,455,'NEW DROPS LIVE',med(34),(90,90,90),spacing=10)
mp=['08-overlength-hare-krishna-navy-2nd-drop/4.jpg','02-acid-lone-wolf-red/1.jpg','09-overlength-levix-peacock-white/2.jpg','12-overlength-doom-black/1.jpg']
pw,gap=474,36; x0=(W-(2*pw+gap))//2; ph=560
for i,p in enumerate(mp): paste(bg,p,x0+(i%2)*(pw+gap),540+(i//2)*(ph+gap)+(0 if i%2==0 else 40),pw,ph,r=30)
bg.save(os.path.expanduser('~/mnt/levix Final pro/product-photos/hero-mobile.jpg'),quality=88,optimize=True,progressive=True)
print('ok')
