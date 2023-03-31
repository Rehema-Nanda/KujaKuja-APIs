**Search item(s)**
----
  Find first 100 searchable items (service points, settlements, and countries)..

**URL:**

/api/v1/search

**Method:**

`GET`

**URL Params**

*  **Required** <br />
  `q = [String]` => Value to search for
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

  * Survey app

**Sample Call:**

  ```javascript
    $.ajax({
      url: "/api/v1/search?q=water",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```