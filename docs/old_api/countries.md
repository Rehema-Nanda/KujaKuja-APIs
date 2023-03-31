**Get countries**
----
  List all enabled countries.

**URL:**

/api/v1/countries

**Method:**

`GET`

**URL Params**

*  **Required** <br />
  None
*  **Optional** <br />
  None

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
      url: "/api/v1/countries",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```
**Show specific country**
----
  Show specific country datas.

**URL:**

/api/v1/countries/:id

**Method:**

`GET`

**URL Params**

*  **Required** <br />
  `id = [Integer]` => Id of country to search for
*  **Optional** <br />
  None

**Data Params**

  None

**Success Response:**

  * **Code:** 200 <br />
    **Content:**

  ```
  { 
    content : String, 
    id: Integer, 
    searchable: Object, 
    searchable_id: Integer, 
    searchable_type: String 
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
      url: "/api/v1/countries/115",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```
