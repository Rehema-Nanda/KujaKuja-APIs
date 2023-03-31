**Get service types**
----
  List all service types.

**URL:**

/api/v1/service_types

**Method:**

`GET`

**URL Params**

  None

**Data Params**

  None

**Success Response:**

  * **Code:** 200 <br />
    **Content:**

  ```
  { 
    icon : String, 
    id: Integer, 
    name: String
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
      url: "/api/v1/service_types",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```