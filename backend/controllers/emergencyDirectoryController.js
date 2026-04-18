const EmergencyContact = require('../models/EmergencyContact');
const { createAuditLog } = require('../services/auditService');
const {
  NIGERIA_STATES,
  NIGERIA_REGIONS,
  STATE_TO_REGION,
  EMERGENCY_AUTHORITY_TYPES,
} = require('../utils/nigeria');
const { STATE_CENTROIDS, haversineDistanceKm } = require('../utils/nigeriaGeo');

const STRUCTURED_AUTHORITY_TYPES = ['police', 'civil_defence', 'military'];
const DEFAULT_AGENCY_BY_TYPE = {
  police: 'Nigeria Police Force',
  civil_defence: 'Nigeria Security and Civil Defence Corps',
  military: 'Nigerian Armed Forces / Joint Task Operations',
};
const DEFAULT_HOTLINES_BY_TYPE = {
  police: ['112', '199'],
  civil_defence: ['08057000076'],
  military: ['193'],
};
const CSV_HEADERS = [
  '_id', 'name', 'agency', 'state', 'region', 'authorityType', 'category',
  'phonePrimary', 'phoneSecondary', 'phoneNumbers', 'email', 'address',
  'active', 'isVerifiedOfficial', 'sourceUrl', 'lastVerifiedAt', 'lat', 'lng', 'notes',
];

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_STATE_ALIASES = { 'Federal Capital Territory': 'FCT', Abuja: 'FCT' };

const parseNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const normalizeStateName = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const direct = NIGERIA_STATES.find((state) => state.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;
  const alias = GOOGLE_STATE_ALIASES[raw] || GOOGLE_STATE_ALIASES[raw.replace(' State', '').trim()];
  if (alias) return alias;
  const withoutState = raw.replace(/ state$/i, '').trim();
  return NIGERIA_STATES.find((state) => state.toLowerCase() === withoutState.toLowerCase()) || null;
};

const normalizeAuthorityType = (contact = {}) => {
  if (contact.authorityType && EMERGENCY_AUTHORITY_TYPES.includes(contact.authorityType)) return contact.authorityType;
  if (contact.type && EMERGENCY_AUTHORITY_TYPES.includes(contact.type)) return contact.type;
  const candidate = `${contact.agency || ''} ${contact.name || ''}`.toLowerCase();
  if (candidate.includes('civil defence') || candidate.includes('nscdc')) return 'civil_defence';
  if (candidate.includes('military') || candidate.includes('army') || candidate.includes('navy') || candidate.includes('air force')) return 'military';
  if (candidate.includes('police')) return 'police';
  return 'other';
};

const normalizePhoneNumbers = (contact = {}) => {
  const fromArray = Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : [];
  return [...new Set([
    contact.phonePrimary,
    contact.phoneSecondary,
    contact.phoneNumber,
    contact.alternatePhone,
    ...fromArray,
  ].filter(Boolean))];
};

const normalizeContactOutput = (contact = {}) => {
  const authorityType = normalizeAuthorityType(contact);
  const phoneNumbers = normalizePhoneNumbers(contact);
  const phonePrimary = contact.phonePrimary || phoneNumbers[0] || null;
  const phoneSecondary = contact.phoneSecondary || phoneNumbers[1] || null;
  const agencyName = contact.agencyName || contact.agency || contact.name || 'Emergency Authority';
  return {
    ...contact,
    name: contact.name || agencyName,
    agency: contact.agency || agencyName,
    agencyName,
    authorityType,
    type: authorityType,
    region: contact.region || STATE_TO_REGION[contact.state] || 'North Central',
    phonePrimary,
    phoneSecondary,
    phoneNumber: phonePrimary,
    alternatePhone: phoneSecondary,
    phoneNumbers,
    isVirtual: Boolean(contact.isVirtual),
  };
};

const normalizeAuthorityTypeQuery = (value) => {
  if (!value || value === 'all') return null;
  return normalizeAuthorityType({ authorityType: String(value), type: String(value) });
};

const matchesSearch = (entry, searchLower) => {
  if (!searchLower) return true;
  const haystack = [entry.name, entry.agency, entry.state, entry.region, entry.authorityType, ...(entry.phoneNumbers || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(searchLower);
};

const buildVirtualEntry = ({ state, authorityType, region }) => {
  const phones = DEFAULT_HOTLINES_BY_TYPE[authorityType] || ['112'];
  return normalizeContactOutput({
    _id: `virtual-${state}-${authorityType}`,
    name: DEFAULT_AGENCY_BY_TYPE[authorityType],
    agency: DEFAULT_AGENCY_BY_TYPE[authorityType],
    state,
    region,
    authorityType,
    category: 'public_safety',
    phonePrimary: phones[0],
    phoneSecondary: phones[1] || null,
    phoneNumbers: phones,
    active: true,
    isVerifiedOfficial: true,
    isVirtual: true,
  });
};

const buildLocationPayload = (body = {}) => {
  const lat = parseNumeric(body.lat ?? body.latitude);
  const lng = parseNumeric(body.lng ?? body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  return { type: 'Point', coordinates: [lng, lat] };
};

const buildAdminPayload = (body = {}, userId = null) => {
  const state = normalizeStateName(body.state) || body.state;
  const authorityType = normalizeAuthorityType(body);
  const phoneNumbers = Array.isArray(body.phoneNumbers)
    ? [...new Set(body.phoneNumbers.filter(Boolean))]
    : normalizePhoneNumbers(body);
  const payload = {
    ...body,
    state,
    authorityType,
    name: body.name || body.agency || body.agencyName,
    agency: body.agency || body.agencyName || body.name,
    region: body.region || STATE_TO_REGION[state] || null,
    phonePrimary: body.phonePrimary || phoneNumbers[0] || null,
    phoneSecondary: body.phoneSecondary || phoneNumbers[1] || null,
    phoneNumbers,
    sourceUrl: body.sourceUrl || body.source || null,
    updatedBy: userId || null,
  };
  const location = buildLocationPayload(body);
  if (location) payload.location = location;
  if (Object.prototype.hasOwnProperty.call(body, 'isVerifiedOfficial')) {
    payload.lastVerifiedAt = body.isVerifiedOfficial ? new Date() : null;
  }
  return payload;
};

const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((cell) => cell.trim());
};

const parseCsvText = (csvText = '') => {
  const text = String(csvText || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
};

const detectStateFromCoordinates = async (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'replace_me_optional') {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        for (const result of results) {
          const components = Array.isArray(result?.address_components) ? result.address_components : [];
          for (const component of components) {
            if ((component?.types || []).includes('administrative_area_level_1')) {
              const state = normalizeStateName(component.long_name) || normalizeStateName(component.short_name);
              if (state) return state;
            }
          }
        }
      }
    } catch (_err) {
      // fall back to centroid proximity
    }
  }
  const nearest = Object.entries(STATE_CENTROIDS)
    .map(([state, centroid]) => ({ state, distanceKm: haversineDistanceKm(lat, lng, centroid.lat, centroid.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  return nearest?.state || null;
};

const getEmergencyDirectory = async (req, res) => {
  try {
    const lat = parseNumeric(req.query.lat ?? req.query.latitude);
    const lng = parseNumeric(req.query.lng ?? req.query.longitude);
    const inferredState = Number.isFinite(lat) && Number.isFinite(lng)
      ? await detectStateFromCoordinates(lat, lng)
      : null;

    const stateFilter = req.query.state && req.query.state !== 'all'
      ? normalizeStateName(req.query.state)
      : inferredState;
    const regionFilter = req.query.region && req.query.region !== 'all' ? String(req.query.region) : null;
    const authorityTypeFilter = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);
    const userState = req.query.userState ? String(req.query.userState) : null;
    const searchLower = String(req.query.search || '').trim().toLowerCase();
    const verifiedOnly = String(req.query.verifiedOnly || 'true') === 'true';

    const filter = { active: true };
    if (stateFilter) filter.state = stateFilter;
    if (regionFilter) filter.region = regionFilter;
    if (authorityTypeFilter) filter.authorityType = authorityTypeFilter;
    if (verifiedOnly) filter.isVerifiedOfficial = true;

    const dbContacts = await EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).lean();
    const normalizedDb = dbContacts.map((contact) => normalizeContactOutput({ ...contact, isVirtual: false }));
    const statesToInclude = NIGERIA_STATES.filter((state) => {
      const region = STATE_TO_REGION[state] || 'North Central';
      if (stateFilter && state !== stateFilter) return false;
      if (regionFilter && region !== regionFilter) return false;
      return true;
    });

    const authorityTypes = authorityTypeFilter ? [authorityTypeFilter] : STRUCTURED_AUTHORITY_TYPES;
    const allEntries = normalizedDb.filter((entry) => matchesSearch(entry, searchLower));
    const existingKeys = new Set(normalizedDb.map((entry) => `${entry.state}::${entry.authorityType}`));

    statesToInclude.forEach((state) => {
      const region = STATE_TO_REGION[state] || 'North Central';
      authorityTypes.forEach((authorityType) => {
        const key = `${state}::${authorityType}`;
        if (!existingKeys.has(key)) {
          const fallback = buildVirtualEntry({ state, authorityType, region });
          if (matchesSearch(fallback, searchLower)) allEntries.push(fallback);
        }
      });
    });

    allEntries.sort((a, b) => {
      if (userState) {
        const aScore = a.state === userState ? 0 : 1;
        const bScore = b.state === userState ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
      }
      if (a.state !== b.state) return a.state.localeCompare(b.state);
      return a.authorityType.localeCompare(b.authorityType);
    });

    const groupedByState = statesToInclude
      .map((state) => ({
        state,
        region: STATE_TO_REGION[state] || 'North Central',
        contacts: allEntries.filter((entry) => entry.state === state),
      }))
      .filter((group) => group.contacts.length > 0);

    const suggestions = [...new Set(
      allEntries
        .flatMap((entry) => [entry.name, entry.agency, ...(entry.phoneNumbers || [])])
        .filter(Boolean)
        .map(String)
    )].slice(0, 20);

    return res.status(200).json({
      success: true,
      contacts: allEntries,
      groupedByState,
      states: NIGERIA_STATES,
      regions: NIGERIA_REGIONS,
      authorityTypes: STRUCTURED_AUTHORITY_TYPES,
      suggestions,
      detectedUserState: userState || null,
      inferredState,
      total: allEntries.length,
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error fetching emergency contacts.' });
  }
};

const getNearbyAuthorities = async (req, res) => {
  try {
    const lat = parseNumeric(req.query.lat ?? req.query.latitude);
    const lng = parseNumeric(req.query.lng ?? req.query.longitude);
    const radiusKm = Math.max(parseNumeric(req.query.radiusKm) || 250, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
    const verifiedOnly = String(req.query.verifiedOnly || 'true') === 'true';
    const authorityTypeFilter = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    const detectedState = normalizeStateName(req.query.state) || await detectStateFromCoordinates(lat, lng);
    const filter = { active: true };
    if (verifiedOnly) filter.isVerifiedOfficial = true;
    if (authorityTypeFilter) filter.authorityType = authorityTypeFilter;

    const dbContacts = await EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).lean();
    const normalized = dbContacts.map((contact) => normalizeContactOutput({ ...contact, isVirtual: false }));
    const contactsToMeasure = [...normalized];

    if (detectedState) {
      const stateContacts = normalized.filter((contact) => contact.state === detectedState);
      const stateTypes = new Set(stateContacts.map((contact) => contact.authorityType));
      const fallbackTypes = authorityTypeFilter ? [authorityTypeFilter] : STRUCTURED_AUTHORITY_TYPES;
      fallbackTypes.forEach((type) => {
        if (!stateTypes.has(type)) {
          contactsToMeasure.push(buildVirtualEntry({
            state: detectedState,
            authorityType: type,
            region: STATE_TO_REGION[detectedState] || 'North Central',
          }));
        }
      });
    }

    const nearby = contactsToMeasure
      .map((contact) => {
        const lngValue = parseNumeric(contact?.location?.coordinates?.[0]);
        const latValue = parseNumeric(contact?.location?.coordinates?.[1]);
        const centroid = STATE_CENTROIDS[contact.state] || null;
        const sourceLat = Number.isFinite(latValue) ? latValue : centroid?.lat;
        const sourceLng = Number.isFinite(lngValue) ? lngValue : centroid?.lng;
        if (!Number.isFinite(sourceLat) || !Number.isFinite(sourceLng)) return null;
        const distanceKm = haversineDistanceKm(lat, lng, sourceLat, sourceLng);
        return { ...contact, distanceKm: Number(distanceKm.toFixed(2)) };
      })
      .filter(Boolean)
      .filter((contact) => contact.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return res.status(200).json({
      success: true,
      nearby,
      detectedState,
      query: { lat, lng, radiusKm, limit },
      total: nearby.length,
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error finding nearby authorities.' });
  }
};

const adminListEmergencyContacts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;
    const filter = {};
    const state = normalizeStateName(req.query.state);
    const authorityType = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);

    if (state) filter.state = state;
    if (req.query.region && req.query.region !== 'all') filter.region = req.query.region;
    if (authorityType) filter.authorityType = authorityType;
    if (req.query.active === 'true' || req.query.active === 'false') filter.active = req.query.active === 'true';
    if (req.query.verifiedOnly === 'true' || req.query.verifiedOnly === 'false') filter.isVerifiedOfficial = req.query.verifiedOnly === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { agency: { $regex: req.query.search, $options: 'i' } },
        { phonePrimary: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).skip(skip).limit(limit).lean(),
      EmergencyContact.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      contacts: contacts.map((contact) => normalizeContactOutput({ ...contact, isVirtual: false })),
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
      total,
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error fetching admin emergency contacts.' });
  }
};

const adminExportEmergencyContactsCsv = async (req, res) => {
  try {
    const filter = {};
    const state = normalizeStateName(req.query.state);
    const authorityType = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);

    if (state) filter.state = state;
    if (req.query.region && req.query.region !== 'all') filter.region = req.query.region;
    if (authorityType) filter.authorityType = authorityType;
    if (req.query.active === 'true' || req.query.active === 'false') filter.active = req.query.active === 'true';
    if (req.query.verifiedOnly === 'true' || req.query.verifiedOnly === 'false') filter.isVerifiedOfficial = req.query.verifiedOnly === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { agency: { $regex: req.query.search, $options: 'i' } },
        { phonePrimary: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const contacts = await EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).lean();
    const lines = [CSV_HEADERS.join(',')];
    contacts.forEach((rawContact) => {
      const contact = normalizeContactOutput(rawContact);
      const lat = contact?.location?.coordinates?.[1] ?? '';
      const lng = contact?.location?.coordinates?.[0] ?? '';
      const row = [
        contact._id,
        contact.name,
        contact.agency,
        contact.state,
        contact.region,
        contact.authorityType,
        contact.category,
        contact.phonePrimary,
        contact.phoneSecondary,
        (contact.phoneNumbers || []).join('|'),
        contact.email,
        contact.address,
        contact.active,
        contact.isVerifiedOfficial,
        contact.sourceUrl,
        contact.lastVerifiedAt ? new Date(contact.lastVerifiedAt).toISOString() : '',
        lat,
        lng,
        contact.notes,
      ].map(escapeCsvCell);
      lines.push(row.join(','));
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="emergency-contacts-${stamp}.csv"`);
    return res.status(200).send(`\uFEFF${lines.join('\n')}`);
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error exporting emergency contacts CSV.' });
  }
};

const adminImportEmergencyContactsCsv = async (req, res) => {
  try {
    const csv = String(req.body?.csv || '');
    const mode = String(req.body?.mode || 'upsert').toLowerCase();
    if (!csv.trim()) return res.status(400).json({ success: false, message: 'CSV content is required.' });

    const rows = parseCsvText(csv);
    if (!rows.length) return res.status(400).json({ success: false, message: 'CSV has no data rows.' });

    const operations = [];
    let skipped = 0;
    rows.forEach((row) => {
      const phoneNumbers = String(row.phoneNumbers || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
      const payload = buildAdminPayload({
        name: row.name,
        agency: row.agency,
        state: normalizeStateName(row.state),
        region: row.region,
        authorityType: row.authorityType,
        category: row.category,
        phonePrimary: row.phonePrimary,
        phoneSecondary: row.phoneSecondary,
        phoneNumbers,
        email: row.email,
        address: row.address,
        sourceUrl: row.sourceUrl,
        notes: row.notes,
        active: parseBoolean(row.active, true),
        isVerifiedOfficial: parseBoolean(row.isVerifiedOfficial, true),
        lat: row.lat,
        lng: row.lng,
      }, req.user?._id);

      if (!payload.name || !payload.agency || !payload.state || !payload.phonePrimary) {
        skipped += 1;
        return;
      }

      const identifier = String(row._id || '').trim();
      const filter = identifier
        ? { _id: identifier }
        : {
            state: payload.state,
            agency: payload.agency,
            authorityType: payload.authorityType,
            phonePrimary: payload.phonePrimary,
          };

      operations.push({ updateOne: { filter, update: { $set: payload }, upsert: true } });
    });

    if (!operations.length) {
      return res.status(400).json({ success: false, message: 'No valid CSV rows were found to import.', skipped });
    }
    if (mode === 'replace') await EmergencyContact.deleteMany({});

    const result = await EmergencyContact.bulkWrite(operations, { ordered: false });

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.csv_import',
      entityType: 'emergency_contact',
      metadata: {
        mode,
        rows: rows.length,
        operations: operations.length,
        skipped,
        inserted: result.upsertedCount || 0,
        modified: result.modifiedCount || 0,
      },
    });

    const io = req.app.get('io');
    if (io) io.emit('emergency-directory:updated', { action: 'csv_import', mode });

    return res.status(200).json({
      success: true,
      message: 'Emergency contacts CSV import completed.',
      summary: {
        mode,
        rows: rows.length,
        operations: operations.length,
        skipped,
        inserted: result.upsertedCount || 0,
        modified: result.modifiedCount || 0,
        matched: result.matchedCount || 0,
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error importing emergency contacts CSV.' });
  }
};

const adminCreateEmergencyContact = async (req, res) => {
  try {
    const payload = buildAdminPayload(req.body, req.user?._id);
    const contact = await EmergencyContact.create(payload);
    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.create',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { state: contact.state, category: contact.category },
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-directory:updated', {
        action: 'created',
        state: contact.state,
        authorityType: contact.authorityType,
        contact: normalizeContactOutput(contact.toObject()),
      });
    }
    return res.status(201).json({ success: true, message: 'Emergency contact created.', contact: normalizeContactOutput(contact.toObject()) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error creating contact.' });
  }
};

const adminUpdateEmergencyContact = async (req, res) => {
  try {
    const payload = buildAdminPayload(req.body, req.user?._id);
    const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });
    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.update',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { updates: Object.keys(req.body || {}) },
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-directory:updated', {
        action: 'updated',
        state: contact.state,
        authorityType: contact.authorityType,
        contact: normalizeContactOutput(contact.toObject()),
      });
    }
    return res.status(200).json({ success: true, message: 'Emergency contact updated.', contact: normalizeContactOutput(contact.toObject()) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error updating contact.' });
  }
};

const adminDeleteEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });
    await contact.deleteOne();
    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.delete',
      entityType: 'emergency_contact',
      entityId: req.params.id,
      metadata: { state: contact.state, agency: contact.agency },
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-directory:updated', {
        action: 'deleted',
        state: contact.state,
        authorityType: contact.authorityType || normalizeAuthorityType(contact),
      });
    }
    return res.status(200).json({ success: true, message: 'Emergency contact deleted.' });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Server error deleting contact.' });
  }
};

module.exports = {
  getEmergencyDirectory,
  getNearbyAuthorities,
  adminListEmergencyContacts,
  adminExportEmergencyContactsCsv,
  adminImportEmergencyContactsCsv,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
};
