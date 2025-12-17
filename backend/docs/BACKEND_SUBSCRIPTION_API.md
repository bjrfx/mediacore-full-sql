# Backend API Endpoints Required for Subscription System

You need to add the following endpoints to your backend:

## 1. Update User Subscription (Admin)
**PUT /admin/users/:uid/subscription**

```javascript
// Request body
{
  "subscriptionTier": "free" | "premium" | "premium_plus" | "enterprise"
}

// Response
{
  "success": true,
  "message": "Subscription updated successfully",
  "data": {
    "uid": "user-uid",
    "subscriptionTier": "premium"
  }
}
```

### Example Implementation (Node.js/Express with Firebase):

```javascript
// In your admin routes
router.put('/users/:uid/subscription', async (req, res) => {
  try {
    const { uid } = req.params;
    const { subscriptionTier } = req.body;
    
    // Validate subscription tier
    const validTiers = ['free', 'premium', 'premium_plus', 'enterprise'];
    if (!validTiers.includes(subscriptionTier)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid subscription tier' 
      });
    }
    
    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(uid, {
      ...(await admin.auth().getUser(uid)).customClaims,
      subscriptionTier: subscriptionTier
    });
    
    // Optionally store in Firestore for easier querying
    await admin.firestore().collection('users').doc(uid).set({
      subscriptionTier: subscriptionTier,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { uid, subscriptionTier }
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
```

## 2. Get User Subscription (User)
**GET /api/user/subscription**

```javascript
// Response
{
  "success": true,
  "data": {
    "subscriptionTier": "free",
    "playbackLimit": 600,
    "resetInterval": 7200000,
    "features": {
      "languages": ["en"],
      "offline": false,
      "adFree": false
    }
  }
}
```

### Example Implementation:

```javascript
router.get('/user/subscription', async (req, res) => {
  try {
    // Get user from auth middleware
    const uid = req.user.uid;
    
    // Get user claims
    const user = await admin.auth().getUser(uid);
    const subscriptionTier = user.customClaims?.subscriptionTier || 'free';
    
    // Define tier features
    const tierFeatures = {
      free: {
        playbackLimit: 600, // 10 minutes
        resetInterval: 7200000, // 2 hours
        languages: ['en'],
        offline: false,
        adFree: false
      },
      premium: {
        playbackLimit: 18000, // 5 hours
        resetInterval: 86400000, // 24 hours
        languages: 'all',
        offline: true,
        adFree: true
      },
      premium_plus: {
        playbackLimit: -1, // Unlimited
        resetInterval: 0,
        languages: 'all',
        offline: true,
        adFree: true
      },
      enterprise: {
        playbackLimit: -1,
        resetInterval: 0,
        languages: 'all',
        offline: true,
        adFree: true,
        apiAccess: true
      }
    };
    
    res.json({
      success: true,
      data: {
        subscriptionTier,
        ...tierFeatures[subscriptionTier]
      }
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
```

## 3. Also update your GET /admin/users endpoint

Make sure user objects include `subscriptionTier`:

```javascript
// When fetching users, include the subscription tier
const users = await Promise.all(
  listUsersResult.users.map(async (user) => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    metadata: user.metadata,
    providerData: user.providerData,
    customClaims: user.customClaims,
    role: user.customClaims?.admin ? 'admin' : 'user',
    subscriptionTier: user.customClaims?.subscriptionTier || 'free', // ADD THIS
  }))
);
```

---

After adding these endpoints, the subscription system will work correctly!
