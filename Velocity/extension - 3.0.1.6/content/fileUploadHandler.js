// content/fileUploadHandler.js

// This function contains all logic for debugging purposes.
// It detects the file, reads it, and calls the APIs directly.
// All console logs will appear in the page's console (F12).

async function uploadFileToContext(fileContent, fileName) {
    const url = "https://thinkvelocity.in/python-backend-D/context/upload";
    const fetchRes = await fetch(fileContent);
    const blob = await fetchRes.blob();
    const formData = new FormData();
    formData.append('file', blob, fileName);

    // console.log("Velocity (Content Script): Calling Upload API:", url);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': "a1cacd98586a0e974faad626dd85f3f4b4fe120b710686773300f2d8c51d63bf"
        },
        body: formData
    });

    if (!response.ok) {
        console.error("Velocity (Content Script): Upload API call failed!", response);
        throw new Error(`Upload failed with status ${response.status}`);
    }
    
    const responseData = await response.json();
    // console.log("Velocity (Content Script): Upload API Response Body:", responseData);
    return responseData;
}

// async function retrieveContext(contextId, query) {
//     const url = "https://thinkvelocity.in/python-backend-D/context/retrieve";
//     const body = { context_id: contextId, query: query, top_k: 3 };

//     console.log("Velocity (Content Script): Calling Retrieve API with body:", body);
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': "a1cacd98586a0e974faad626dd85f3f4b4fe120b710686773300f2d8c51d63bf"
//         },
//         body: JSON.stringify(body)
//     });

//     if (!response.ok) {
//         console.error("Velocity (Content Script): Retrieve API call failed!", response);
//         throw new Error(`Retrieve failed with status ${response.status}`);
//     }
    
//     const responseData = await response.json();
//     console.log("Velocity (Content Script): Retrieve API Response Body:", responseData);
//     return responseData;
// }

function initializeFileUploadHandler() {
    // console.log("Velocity: Initializing file upload handler to detect file inputs.");
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        // console.log("Velocity: Found a file input element on the page:", fileInput);
        fileInput.addEventListener('change', (event) => {
            if (event.target.files && event.target.files.length > 0) {
                const file = event.target.files[0];
                // console.log(`Velocity: Intercepted new file: ${file.name}`);
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const fileContentBase64 = e.target.result;
                    // console.log("Velocity: File read. Now calling APIs directly from content script.");
                    try {
                        const uploadResponse = await uploadFileToContext(fileContentBase64, file.name);
                        if (uploadResponse && uploadResponse.context_id) {
                            // Store context_id in chrome.storage.local
                            chrome.storage.local.set({ velocityContextId: uploadResponse.context_id }, function() {
                                // console.log('Velocity: Stored context_id in chrome.storage.local:', uploadResponse.context_id);
                            });
                            await retrieveContext(uploadResponse.context_id, `Verify content of ${file.name}`);
                        }
                    } catch (error) {
                        console.error("Velocity (Content Script): An error occurred during the API calls. This might be a CORS error, which is expected when calling from a content script.", error);
                    }
                };
                reader.onerror = (e) => console.error("Velocity: An error occurred while reading the file.", e);
                reader.readAsDataURL(file);
            }
        });
    } else {
        // console.log("Velocity: No 'input[type=file]' element found on this page.");
    }
}

setTimeout(initializeFileUploadHandler, 2000);
 