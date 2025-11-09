const bookshelvesDiv = document.getElementById('bookshelves');
const addBookshelfBtn = document.getElementById('addBookshelfBtn');
const editorModal = document.getElementById('editorModal');
const editorCanvas = document.getElementById('editorCanvas');
const drawBtn = document.getElementById('drawBtn');
const eraseBtn = document.getElementById('eraseBtn');
const textBtn = document.getElementById('textBtn');
const imageBtn = document.getElementById('imageBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const closeEditorBtn = document.getElementById('closeEditorBtn');
const exportPageBtn = document.getElementById('exportPageBtn');
const exportBookBtn = document.getElementById('exportBookBtn');
const imageUpload = document.getElementById('imageUpload');

let bookshelves = JSON.parse(localStorage.getItem('bookshelves') || '[]');
let currentBook = null;
let currentPage = 0;
let tool = 'draw';
let drawing = false;
let ctx = editorCanvas.getContext('2d');

// 文字拖動相關
let selectedText = null;
let offsetX = 0;
let offsetY = 0;

function saveBookshelves(){ localStorage.setItem('bookshelves', JSON.stringify(bookshelves)); }

function renderBookshelves(){
  bookshelvesDiv.innerHTML='';
  bookshelves.forEach((shelf,sIndex)=>{
    const shelfDiv = document.createElement('div');
    shelfDiv.className='bookshelf';
    const shelfTitle = document.createElement('h2');
    shelfTitle.textContent=shelf.name;
    shelfDiv.appendChild(shelfTitle);

    const addBookBtn = document.createElement('button');
    addBookBtn.textContent='新增書本';
    addBookBtn.onclick=()=>{ addBook(sIndex); };
    shelfDiv.appendChild(addBookBtn);

    shelf.books.forEach((book,bIndex)=>{
      const bookDiv=document.createElement('div');
      bookDiv.className='book';
      bookDiv.textContent=book.title;
      bookDiv.onclick=()=>{ openBook(sIndex,bIndex); };
      shelfDiv.appendChild(bookDiv);
    });
    bookshelvesDiv.appendChild(shelfDiv);
  });
}

function addBookshelf(){
  const name=prompt('書櫃名稱')||'新書櫃';
  bookshelves.push({name,books:[]});
  saveBookshelves();
  renderBookshelves();
}

function addBook(shelfIndex){
  const title=prompt('書名')||'新書';
  const style=prompt('內頁樣式（blank/lined/grid）','blank')||'blank';
  const pages=+prompt('頁數','10')||10;
  const material=prompt('封面材質','布質')||'布質';
  bookshelves[shelfIndex].books.push({
    title,style,pages,material,
    content:Array.from({length:pages},()=>({elements:[]}))
  });
  saveBookshelves();
  renderBookshelves();
}

function openBook(shelfIndex,bookIndex){
  currentBook = bookshelves[shelfIndex].books[bookIndex];
  currentPage = 0;
  editorModal.classList.remove('hidden');
  drawCanvas();
}

function drawCanvas(){
  editorCanvas.width = editorCanvas.clientWidth;
  editorCanvas.height = editorCanvas.clientHeight;
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,editorCanvas.width,editorCanvas.height);

  const page = currentBook.content[currentPage];
  if(page.elements){
    page.elements.forEach(el=>{
      if(el.type==='stroke'){
        ctx.strokeStyle=el.color; ctx.lineWidth=el.size;
        ctx.beginPath();
        ctx.moveTo(el.path[0].x,el.path[0].y);
        el.path.forEach(p=>ctx.lineTo(p.x,p.y));
        ctx.stroke();
      } else if(el.type==='text'){
        ctx.fillStyle=el.color; ctx.font=`${el.size}px ${el.font}`;
        ctx.fillText(el.text,el.x,el.y);
      } else if(el.type==='image'){
        const img=new Image();
        img.onload=()=>ctx.drawImage(img,el.x,el.y,el.w,el.h);
        img.src=el.src;
      }
    });
  }
}

// --- 工具邏輯 ---
editorCanvas.addEventListener('mousedown',(e)=>{
  const rect = editorCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const page = currentBook.content[currentPage];

  if(tool==='draw' || tool==='erase'){
    drawing = true;
    const stroke={type:'stroke',color:tool==='erase'?'#fff':'#000',size:2,path:[{x,y}]};
    if(!page.elements) page.elements=[];
    page.elements.push(stroke);

    function drawMove(ev){
      if(!drawing) return;
      const mx=ev.clientX-rect.left;
      const my=ev.clientY-rect.top;
      stroke.path.push({x:mx,y:my});
      ctx.strokeStyle=stroke.color;
      ctx.lineWidth=stroke.size;
      ctx.beginPath();
      const p0 = stroke.path[stroke.path.length-2];
      ctx.moveTo(p0.x,p0.y);
      ctx.lineTo(mx,my);
      ctx.stroke();
    }
    function stop(){ drawing=false; document.removeEventListener('mousemove',drawMove); document.removeEventListener('mouseup',stop); }
    document.addEventListener('mousemove',drawMove);
    document.addEventListener('mouseup',stop);

  } else if(tool==='text'){
    selectedText = null;
    if(page.elements){
      for(let i=page.elements.length-1;i>=0;i--){
        const el = page.elements[i];
        if(el.type==='text'){
          const width = ctx.measureText(el.text).width;
          const height = el.size;
          if(x>=el.x && x<=el.x+width && y<=el.y && y>=el.y-height){
            selectedText = el;
            offsetX = x - el.x;
            offsetY = y - el.y;
            break;
          }
        }
      }
    }
    if(!selectedText){
      const txt=prompt('輸入文字');
      if(txt){
        if(!page.elements) page.elements=[];
        const newText={type:'text',x,y,text:txt,size:18,color:'#000',font:'新細明體'};
        page.elements.push(newText);
        drawCanvas();
      }
    }
  }
});

editorCanvas.addEventListener('mousemove',(e)=>{
  if(selectedText){
    const rect = editorCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    selectedText.x = x - offsetX;
    selectedText.y = y - offsetY;
    drawCanvas();
  }
});

editorCanvas.addEventListener('mouseup',()=>{ selectedText=null; });

drawBtn.onclick=()=>{ tool='draw'; }
eraseBtn.onclick=()=>{ tool='erase'; }
textBtn.onclick=()=>{ tool='text'; }
imageBtn.onclick=()=>{ imageUpload.click(); }

imageUpload.addEventListener('change',(e)=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=function(evt){
    const imgData=evt.target.result;
    const page=currentBook.content[currentPage];
    if(!page.elements) page.elements=[];
    page.elements.push({type:'image',x:10,y:10,w:200,h:200,src:imgData});
    drawCanvas();
  };
  reader.readAsDataURL(file);
});

prevPageBtn.onclick=()=>{ if(currentPage>0) currentPage--; drawCanvas(); };
nextPageBtn.onclick=()=>{ if(currentPage<currentBook.pages-1) currentPage++; drawCanvas(); };

exportPageBtn.onclick=()=>{
  const dataURL=editorCanvas.toDataURL('image/png');
  const a=document.createElement('a');
  a.href=dataURL; a.download=`${currentBook.title}_page${currentPage+1}.png`;
  a.click();
};

exportBookBtn.onclick=()=>{
  const dataStr='data:text/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(currentBook));
  const a=document.createElement('a');
  a.href=dataStr; a.download=`${currentBook.title}.json`;
  a.click();
};

closeEditorBtn.onclick=()=>{ editorModal.classList.add('hidden'); saveBookshelves(); }
addBookshelfBtn.onclick=addBookshelf;
renderBookshelves();
