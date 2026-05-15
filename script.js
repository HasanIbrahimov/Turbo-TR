document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. TEMA DEĞİŞTİRME MANTIĞI
  // ==========================================
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    const currentTheme = localStorage.getItem("theme") || "light"; 
    
    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
      themeToggleBtn.innerHTML = "☀️ Açık Tema";
    } else {
      document.body.classList.remove("dark-theme");
      themeToggleBtn.innerHTML = "🌙 Koyu Tema";
    }

    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      if (document.body.classList.contains("dark-theme")) {
        localStorage.setItem("theme", "dark");
        themeToggleBtn.innerHTML = "☀️ Açık Tema";
      } else {
        localStorage.setItem("theme", "light");
        themeToggleBtn.innerHTML = "🌙 Koyu Tema";
      }
    });
  }

  // ==========================================
  // 1.5 OTURUM KONTROLÜ (LOCALSTORAGE)
  // ==========================================
  const userName = localStorage.getItem("userName");
  const loginLinks = document.querySelectorAll('a.nav-link[href="login.html"]');

  if (userName) {
    // Tüm sayfalardaki 'Giriş Yap' linkini isimle değiştir ve 'Çıkış Yap' özelliği ekle
    loginLinks.forEach(link => {
      link.innerHTML = `👤 ${userName} <span class="logout-btn ms-2 badge bg-danger text-white" style="cursor: pointer;">Çıkış Yap</span>`;
      link.removeAttribute("href"); // Tıklanınca login'e gitmesin

      const logoutBtn = link.querySelector(".logout-btn");
      if(logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          localStorage.removeItem("userName");
          window.location.reload(); // Sayfayı yenile
        });
      }
    });

    // Kayıt Ol butonunu gizle (zaten giriş yapılmış)
    const registerLinks = document.querySelectorAll('a.nav-link[href="kayit.html"]');
    registerLinks.forEach(link => link.style.display = 'none');
  }

  // ==========================================
  // 2. FORM DOĞRULAMA (KAYIT & GİRİŞ) - BACKEND ENTEGRASYONLU
  // ==========================================
  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const fullnameInput = document.getElementById("fullname"); // Sadece kayıt sayfasında var
      
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value.trim() : "";
      const fullname = fullnameInput ? fullnameInput.value.trim() : "";
      
      // Frontend Doğrulamaları (Yönerge Gereksinimi)
      if (!email || !password || (fullnameInput && !fullname)) {
        alert("Lütfen tüm alanları doldurun.");
        return;
      }
      if (!email.includes("@")) {
        alert("Geçerli bir e-posta adresi girin (içinde @ olmalı).");
        return;
      }
      if (password.length < 6) {
        alert("Şifreniz en az 6 karakter olmalıdır.");
        return;
      }

      // Backend API İsteği (Veritabanı Entegrasyonu)
      const isRegister = fullnameInput !== null;
      const endpoint = isRegister ? "/register" : "/login";
      const payload = isRegister ? { ad_soyad: fullname, eposta: email, sifre: password } : { eposta: email, sifre: password };

      try {
        const response = await fetch(`${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          if (!isRegister && data.name) {
            localStorage.setItem("userName", data.name);
          }
          alert(data.message);
          window.location.href = "index.html"; // Başarılıysa ana sayfaya dön
        } else {
          alert("Hata: " + data.error);
        }
      } catch (error) {
        console.error("Sunucu bağlantı hatası:", error);
        alert("Sunucuya bağlanılamadı. Lütfen terminalden Node.js sunucusunu başlattığınızdan emin olun (node server.js).");
      }
    });
  }

  // ==========================================
  // 3. NOTLAR UYGULAMASI (DOM MANİPÜLASYONU VE VERİTABANI)
  // ==========================================
  const noteForm = document.getElementById("note-form");
  const noteInput = document.getElementById("note-input");
  const noteList = document.getElementById("note-list");
  const noteCountText = document.getElementById("note-count");

  if (noteForm) {
    let noteCount = 0;

    const updateNoteCount = () => {
      noteCountText.textContent = `Toplam Not Sayısı: ${noteCount}`;
    };

    // DOM'a Not Ekleme (Arayüzde Gösterme)
    const addNoteToDOM = (id, text) => {
      const li = document.createElement("li");
      li.className = "note-item";
      li.dataset.id = id;
      
      const span = document.createElement("span");
      span.textContent = text;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger btn-sm";
      deleteBtn.textContent = "Sil";
      
      // SQLite Veritabanından ve Ekrandan Silme İşlemi
      deleteBtn.addEventListener("click", async () => {
        try {
          const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
          if (response.ok) {
            li.remove();
            noteCount--;
            updateNoteCount();
          } else {
            alert("Not silinirken hata oluştu.");
          }
        } catch (error) {
          alert("Sunucuya bağlanılamadı.");
        }
      });

      li.appendChild(span);
      li.appendChild(deleteBtn);
      noteList.appendChild(li);
      
      noteCount++;
      updateNoteCount();
    };

    // Sayfa Yüklendiğinde Veritabanındaki Notları Getir
    const loadNotes = async () => {
      try {
        const response = await fetch("/api/notes");
        if (response.ok) {
          const notes = await response.json();
          noteCount = 0;
          noteList.innerHTML = "";
          notes.forEach(note => {
            addNoteToDOM(note.id, note.content);
          });
        }
      } catch (error) {
        console.warn("Veritabanından notlar çekilemedi. Node.js sunucusu kapalı olabilir.");
      }
    };

    loadNotes();

    // Yeni Not Ekleme İşlemi (Veritabanına Kayıt)
    noteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = noteInput.value.trim();
      if (text === "") return;

      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, userId: 1 })
        });

        const data = await response.json();
        if (response.ok) {
          addNoteToDOM(data.id, data.content);
          noteInput.value = "";
        } else {
          alert("Not eklenemedi: " + data.error);
        }
      } catch (error) {
        alert("Sunucuya bağlanılamadı. Lütfen sunucuyu (node server.js) çalıştırın.");
      }
    });
  }

  // ==========================================
  // 4. SLIDER (GÖRSEL MEDYA YÖNETİMİ)
  // ==========================================
  const sliderImages = document.querySelectorAll(".slider-img");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (sliderImages.length > 0) {
    let currentIndex = 0;

    function showImage(index) {
      sliderImages.forEach((img, i) => {
        if (i === index) {
          img.classList.add("active");
        } else {
          img.classList.remove("active");
        }
      });
    }

    nextBtn.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % sliderImages.length;
      showImage(currentIndex);
    });

    prevBtn.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + sliderImages.length) % sliderImages.length;
      showImage(currentIndex);
    });
  }

  // ==========================================
  // 5. SATICIYA MESAJ GÖNDERME (DOM ETKİLEŞİMİ)
  // ==========================================
  const messageBtn = document.getElementById("message-btn");
  const messageContainer = document.getElementById("message-container");

  if (messageBtn) {
    messageBtn.addEventListener("click", () => {
      messageBtn.style.display = "none";

      const textarea = document.createElement("textarea");
      textarea.className = "form-control mb-2";
      textarea.rows = 4;
      textarea.placeholder = "Mesajınızı buraya yazın...";

      const sendBtn = document.createElement("button");
      sendBtn.className = "btn btn-success w-100";
      sendBtn.textContent = "Gönder";

      sendBtn.addEventListener("click", () => {
        if (textarea.value.trim() === "") {
          alert("Lütfen bir mesaj yazın.");
          return;
        }
        alert("Mesaj başarıyla iletildi!");
        
        messageContainer.innerHTML = "";
        const successText = document.createElement("p");
        successText.className = "text-success fw-bold";
        successText.textContent = "Mesaj iletildi.";
        messageContainer.appendChild(successText);
      });

      messageContainer.appendChild(textarea);
      messageContainer.appendChild(sendBtn);
    });
  }

  // ==========================================
  // 6. CANLI ARAMA ÇUBUĞU (index.html)
  // ==========================================
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      const filter = e.target.value.toLowerCase();
      const cards = document.querySelectorAll("#carList > div");
      
      cards.forEach(card => {
        const title = card.querySelector(".card-title").textContent.toLowerCase();
        if (title.includes(filter)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  // ==========================================
  // 7. MODAL GÖRSEL BÜYÜTME (Detay Sayfaları)
  // ==========================================
  const modalImage = document.getElementById("modalImage");
  if (sliderImages.length > 0 && modalImage) {
    sliderImages.forEach(img => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => {
        modalImage.src = img.src;
        const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
        imageModal.show();
      });
    });
  }
});
