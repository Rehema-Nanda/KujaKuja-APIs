**Get settlements**
----
  List or search settlements.

**URL:**

/api/v1/settlements

**Method:**

`GET`

**URL Params**

*  **Required**<br />
  None

*  **Optional**<br />
  `name = [String]` => Limit list to this name search parameter

**Data Params**

  None

**Success Response:**

  * **Code:** 200 <br />
    **Content:**

  ```
  { 
    0 : Object, 
    1: Object, 
    ..., 
    x: Object 
  }
  ```

**Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:**

  ```
  { 
    status: 404, 
    error : "", 
    trace: "Rails backtrace", 
    params: "request params" 
  }
```

OR

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:**

  ```
    { 
      error : "Unauthorized" 
    }
  ```


**Consumer(s):**

  * Frontend app

**Sample Call:**

  ```javascript
    $.ajax({
      url: "/api/v1/settlements",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```

  ```javascript
    $.ajax({
      url: "/api/v1/settlements?name=Oruchinga",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```
**Show specific settlement**
----
  Show specific settlement datas.

**URL:**

/api/v1/settlements/:id

**Method:**

`GET`

**URL Params**

*  **Required** <br />
  `id=[Integer]` => Id of settlement to search for

* **Optional** <br />
  None

**Data Params**

  None

**Success Response:**

  * **Code:** 200 <br />
    **Content:**<br />

  ```javascript
    { 
      country_id : Integer, 
      geojson: Object, 
      id: Integer, 
      lat: String/Float (?), 
      lng: String/Float (?), 
      name: String, 
      photo: String, 
      photo_large: String, 
      photo_medium: String 
    }
  ```

**Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:**

  ```
  { 
    status: 404, 
    error : "", 
    trace: "Rails backtrace", 
    params: "request params" 
  }
```

OR

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:**

  ```
    { 
      error : "Unauthorized" 
    }
  ```


**Consumer(s):**

  * Frontend app

**Sample Call:**

  ```javascript
    $.ajax({
      url: "/api/v1/settlements/10",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```