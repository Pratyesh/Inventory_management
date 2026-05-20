function login(){

  const username =
    document.getElementById("username").value;

  const password =
    document.getElementById("password").value;

  const error =
    document.getElementById("error");

  if(username === "admin" && password === "1234"){

    window.location.href = "dashboard.html";

  }else{

    error.innerHTML = "Invalid Username or Password";

  }
}

// Get Inventory Data

function getItems(){

  return JSON.parse(localStorage.getItem("inventory")) || [];
}

// Save Inventory Data

function saveItems(items){

  localStorage.setItem("inventory",JSON.stringify(items));
}

// Add Item

function addItem(){

  const name =
    document.getElementById("itemName").value;

  const location =
    document.getElementById("itemLocation").value;

  const status =
    document.getElementById("itemStatus").value;

  const imageInput =
    document.getElementById("itemImage");

  if(name === "" || location === ""){

    alert("Please fill all fields");
    return;
  }

  const file = imageInput.files[0];

  if(!file){
    alert("Please select an image");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e){

    const items = getItems();

    items.push({
      name:name,
      location:location,
      status:status,
      image:e.target.result
    });

    saveItems(items);

    displayItems();

    document.getElementById("itemName").value = "";
    document.getElementById("itemLocation").value = "";
    document.getElementById("itemImage").value = "";
  }

  reader.readAsDataURL(file);
}

// Display Items

function displayItems(){

  const items = getItems();

  const table =
    document.getElementById("inventoryBody");

  if(!table) return;

  table.innerHTML = "";

  items.forEach((item,index)=>{

    table.innerHTML += `

      <tr>

        <td>
          <img src="${item.image}" class="item-image">
        </td>

        <td>${item.name}</td>

        <td>${item.location}</td>

        <td class="${item.status === "Available" ? "status-available" : "status-lost"}">
          ${item.status}
        </td>

        <td>
          <button class="delete-btn" onclick="deleteItem(${index})">
            Delete
          </button>
        </td>

      </tr>
    `;
  });
}

// Delete Item

function deleteItem(index){

  const items = getItems();

  items.splice(index,1);

  saveItems(items);

  displayItems();
}

// Search Inventory

function searchItem(){

  const search =
    document.getElementById("searchInput").value.toLowerCase();

  const rows =
    document.querySelectorAll("#inventoryBody tr");

  rows.forEach(row=>{

    const text = row.innerText.toLowerCase();

    row.style.display =
      text.includes(search) ? "" : "none";
  });
}

// Dashboard Statistics

function loadDashboard(){

  const items = getItems();

  const total = items.length;

  const available =
    items.filter(item=>item.status === "Available").length;

  const lost =
    items.filter(item=>item.status === "Lost").length;

  document.getElementById("totalItems").innerHTML = total;

  document.getElementById("availableItems").innerHTML = available;

  document.getElementById("lostItems").innerHTML = lost;
}
