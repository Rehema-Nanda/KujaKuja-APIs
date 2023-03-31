**Online status test**
----
  Check if client application is online and able to communicate with API.

**URL:**

/api/v1/online_status_test

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
      result : true 
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
      url: "/api/v1/online_status_test",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```